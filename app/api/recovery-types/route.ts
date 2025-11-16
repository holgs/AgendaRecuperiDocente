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

    const body = await request.json()
    const validatedData = recoveryTypeSchema.parse(body)

    const { data: recoveryType, error: createError } = await supabase
      .from('recovery_types')
      .insert({
        name: validatedData.name,
        description: validatedData.description ?? null,
        color: validatedData.color,
        default_duration: validatedData.default_duration ?? null,
        requires_approval: validatedData.requires_approval,
        is_active: validatedData.is_active,
        created_by: user.id
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    return NextResponse.json(recoveryType, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating recovery type:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
