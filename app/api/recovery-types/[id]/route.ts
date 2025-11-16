import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateRecoveryTypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  default_duration: z.union([
    z.number().int().min(1).max(300),
    z.null()
  ]).optional(),
  requires_approval: z.boolean().optional(),
  is_active: z.boolean().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: recoveryType, error: typeError } = await supabase
      .from('recovery_types')
      .select('*')
      .eq('id', id)
      .single()

    if (typeError || !recoveryType) {
      return NextResponse.json({ error: 'Recovery type not found' }, { status: 404 })
    }

    // Get activity count
    const { count } = await supabase
      .from('recovery_activities')
      .select('*', { count: 'exact', head: true })
      .eq('recovery_type_id', id)

    const typeWithCount = {
      ...recoveryType,
      _count: {
        recovery_activities: count || 0
      }
    }

    return NextResponse.json(typeWithCount)
  } catch (error) {
    console.error('Error fetching recovery type:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateRecoveryTypeSchema.parse(body)

    const updateData: any = {}

    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description ?? null
    if (validatedData.color !== undefined) updateData.color = validatedData.color
    // Only update default_duration if it has a value (not null/undefined)
    if (validatedData.default_duration !== undefined && validatedData.default_duration !== null) {
      updateData.default_duration = validatedData.default_duration
    }
    if (validatedData.requires_approval !== undefined) updateData.requires_approval = validatedData.requires_approval
    if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active

    const { data: recoveryType, error: updateError } = await supabase
      .from('recovery_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json(recoveryType)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating recovery type:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if recovery type is being used in any activities
    const { count: activityCount } = await supabase
      .from('recovery_activities')
      .select('*', { count: 'exact', head: true })
      .eq('recovery_type_id', id)

    if (activityCount && activityCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete recovery type in use',
          details: `This type is used in ${activityCount} activities. Consider deactivating instead.`
        },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('recovery_types')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recovery type:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
