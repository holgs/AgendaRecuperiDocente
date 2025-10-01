import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schoolYearSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  start_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
  end_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date'),
  is_active: z.boolean().default(false),
  weeks_count: z.number().int().min(1).max(52).default(30)
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

    const schoolYears = await prisma.school_years.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: { start_date: 'desc' }
    })

    return NextResponse.json(schoolYears)
  } catch (error) {
    console.error('Error fetching school years:', error)
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
    const validatedData = schoolYearSchema.parse(body)

    // If setting as active, deactivate all other school years
    if (validatedData.is_active) {
      await prisma.school_years.updateMany({
        where: { is_active: true },
        data: { is_active: false }
      })
    }

    const schoolYear = await prisma.school_years.create({
      data: {
        name: validatedData.name,
        start_date: new Date(validatedData.start_date),
        end_date: new Date(validatedData.end_date),
        is_active: validatedData.is_active,
        weeks_count: validatedData.weeks_count
      }
    })

    return NextResponse.json(schoolYear, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating school year:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
