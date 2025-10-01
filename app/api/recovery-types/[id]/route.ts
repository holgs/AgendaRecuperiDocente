import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateRecoveryTypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  default_duration: z.number().int().min(1).max(300).optional(),
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

    const recoveryType = await prisma.recovery_types.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            recovery_activities: true
          }
        }
      }
    })

    if (!recoveryType) {
      return NextResponse.json({ error: 'Recovery type not found' }, { status: 404 })
    }

    return NextResponse.json(recoveryType)
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
    if (validatedData.default_duration !== undefined) updateData.default_duration = validatedData.default_duration
    if (validatedData.requires_approval !== undefined) updateData.requires_approval = validatedData.requires_approval
    if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active

    const recoveryType = await prisma.recovery_types.update({
      where: { id },
      data: updateData
    })

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
    const activityCount = await prisma.recovery_activities.count({
      where: { recovery_type_id: id }
    })

    if (activityCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete recovery type in use',
          details: `This type is used in ${activityCount} activities. Consider deactivating instead.`
        },
        { status: 400 }
      )
    }

    await prisma.recovery_types.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recovery type:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
