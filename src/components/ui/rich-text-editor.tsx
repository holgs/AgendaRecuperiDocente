'use client'

import * as React from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Heading2, Italic, List, ListOrdered, Quote, Redo, Undo } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const EMPTY_CONTENT = '<p></p>'

export type RichTextEditorProps = {
  value?: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
  toolbarClassName?: string
}

const normalizeContent = (value?: string) => {
  if (!value) return ''
  return value === EMPTY_CONTENT ? '' : value
}

export function RichTextEditor({
  value = '',
  onChange,
  onBlur,
  placeholder = 'Scrivi una descrizione...',
  className,
  toolbarClassName,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: true,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true,
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'before:text-muted-foreground before:content-[attr(data-placeholder)] before:pointer-events-none',
      }),
    ],
    content: value || '',
    onUpdate({ editor }) {
      const nextValue = normalizeContent(editor.getHTML())
      onChange(nextValue)
    },
    editorProps: {
      attributes: {
        class: cn(
          'min-h-[160px] w-full rounded-b-md bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none',
          '[&_ol]:list-decimal [&_ul]:list-disc [&_li]:ml-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground'
        ),
      },
      handleDOMEvents: {
        blur: () => {
          onBlur?.()
          return false
        },
      },
    },
  })

  React.useEffect(() => {
    if (!editor) return
    const normalizedValue = normalizeContent(value)
    const currentValue = normalizeContent(editor.getHTML())

    if (normalizedValue !== currentValue) {
      if (normalizedValue) {
        editor.commands.setContent(normalizedValue, false, { preserveWhitespace: true })
      } else {
        editor.commands.clearContent(false)
      }
    }
  }, [editor, value])

  React.useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  const isButtonActive = React.useCallback(
    (type: string, attributes?: Record<string, unknown>) => {
      if (!editor) return false
      return editor.isActive(type, attributes)
    },
    [editor]
  )

  return (
    <div
      className={cn(
        'flex w-full flex-col rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
        className
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-center gap-1 border-b border-input/60 bg-muted/40 px-2 py-1 text-muted-foreground',
          toolbarClassName
        )}
      >
        <ToolbarButton
          label="Grassetto"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          isActive={isButtonActive('bold')}
          disabled={!editor}
          icon={Bold}
        />
        <ToolbarButton
          label="Corsivo"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          isActive={isButtonActive('italic')}
          disabled={!editor}
          icon={Italic}
        />
        <ToolbarButton
          label="Titolo"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={isButtonActive('heading', { level: 2 })}
          disabled={!editor}
          icon={Heading2}
        />
        <ToolbarButton
          label="Lista puntata"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={isButtonActive('bulletList')}
          disabled={!editor}
          icon={List}
        />
        <ToolbarButton
          label="Lista numerata"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          isActive={isButtonActive('orderedList')}
          disabled={!editor}
          icon={ListOrdered}
        />
        <ToolbarButton
          label="Citazione"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          isActive={isButtonActive('blockquote')}
          disabled={!editor}
          icon={Quote}
        />
        <ToolbarButton
          label="Annulla"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
          icon={Undo}
        />
        <ToolbarButton
          label="Ripristina"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
          icon={Redo}
        />
      </div>
      <EditorContent editor={editor} className="w-full" />
    </div>
  )
}

type ToolbarButtonProps = {
  label: string
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  isActive?: boolean
  disabled?: boolean
}

function ToolbarButton({ label, onClick, icon: Icon, isActive, disabled }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={isActive ? 'default' : 'ghost'}
      onClick={onClick}
      disabled={disabled}
      className={cn('h-8 w-8 p-0', isActive ? 'shadow-none' : 'text-muted-foreground')}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}
