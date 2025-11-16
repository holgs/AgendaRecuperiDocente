import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const recoveryTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  default_duration: z.union([
    z.number().int().min(1).max(300),
    z.null()
  ]).optional(),
  requires_approval: z.boolean().default(false),
  is_active: z.boolean().default(true)
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const search = searchParams.get('search')

    let query = supabase
      .from('recovery_types')
      .select('*')

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: recoveryTypes, error: typesError } = await query.order('created_at', { ascending: false })

    if (typesError) {
      throw typesError
    }

    // Get activity counts for each type
    const typesWithCounts = await Promise.all(
      (recoveryTypes || []).map(async (type) => {
        const { count } = await supabase
          .from('recovery_activities')
          .select('*', { count: 'exact', head: true })
          .eq('recovery_type_id', type.id)

        return {
          ...type,
          _count: {
            recovery_activities: count || 0
          }
        }
      })
    )

    return NextResponse.json(typesWithCounts)
  } catch (error) {
    console.error('Error fetching recovery types:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!existingUser) {
      // Create user if doesn't exist
      await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          role: 'admin'
        })
    }

    const body = await request.json()
    const validatedData = recoveryTypeSchema.parse(body)

    // Build insert payload conditionally
    const insertData: any = {
      name: validatedData.name,
      description: validatedData.description ?? null,
      color: validatedData.color,
      requires_approval: validatedData.requires_approval,
      is_active: validatedData.is_active,
      created_by: user.id
    }

    // Only include default_duration if it's provided
    if (validatedData.default_duration !== null && validatedData.default_duration !== undefined) {
      insertData.default_duration = validatedData.default_duration
    }

    const { data: recoveryType, error: createError } = await supabase
      .from('recovery_types')
      .insert(insertData)
      .select()
      .single()

    if (createError) {
      console.error('❌ Supabase insert error FULL DETAILS:', JSON.stringify(createError, null, 2))
      return NextResponse.json(
        {
          error: createError.message || 'Database error',
          details: createError.details || 'No details available',
          hint: createError.hint || 'No hint available',
          code: createError.code || 'Unknown code'
        },
        { status: 500 }
      )
    }

    console.log('✅ Successfully created recovery type:', recoveryType)
    return NextResponse.json(recoveryType, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Zod validation error:', error.errors)
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('❌ Error creating recovery type FULL:', error)
    const errorObj = error as any
    return NextResponse.json(
      {
        error: errorObj.message || 'Internal server error',
        details: errorObj.details || 'No details',
        hint: errorObj.hint || 'No hint',
        code: errorObj.code || 'No code'
      },
      { status: 500 }
    )
  }
}
