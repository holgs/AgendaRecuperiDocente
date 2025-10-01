import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const recoveryTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  default_duration: z.number().int().min(1).max(300).optional(),
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

    const where: any = {}

    if (activeOnly) {
      where.is_active = true
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const recoveryTypes = await prisma.recovery_types.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: {
            recovery_activities: true
          }
        }
      }
    })

    return NextResponse.json(recoveryTypes)
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

    const recoveryType = await prisma.recovery_types.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        color: validatedData.color,
        default_duration: validatedData.default_duration || null,
        requires_approval: validatedData.requires_approval,
        is_active: validatedData.is_active,
        created_by: user.id
      }
    })

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
