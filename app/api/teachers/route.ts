import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teachers = await prisma.teachers.findMany({
      orderBy: [
        { cognome: 'asc' },
        { nome: 'asc' }
      ],
      include: {
        teacher_budgets: {
          include: {
            school_year: true
          },
          orderBy: {
            import_date: 'desc'
          }
        }
      }
    })

    return NextResponse.json({ teachers })
  } catch (error) {
    console.error('Error fetching teachers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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
    const { cognome, nome, email } = body

    if (!cognome || !nome) {
      return NextResponse.json(
        { error: 'Cognome and nome are required' },
        { status: 400 }
      )
    }

    const teacher = await prisma.teachers.create({
      data: {
        cognome,
        nome,
        email: email || null
      }
    })

    return NextResponse.json({ teacher }, { status: 201 })
  } catch (error) {
    console.error('Error creating teacher:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}