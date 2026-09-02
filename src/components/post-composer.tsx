"use client"

import { useRef, useState, type ReactNode } from "react"
import { Bold, Code2, ImagePlus, Italic, Link2, List, ListOrdered, Redo2, Undo2, WandSparkles } from "lucide-react"
import { EditorContent, useEditor } from "@tiptap/react"
import Link from "@tiptap/extension-link"
import StarterKit from "@tiptap/starter-kit"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useLocale } from "@/lib/i18n"

function EditorButton({ label, onClick, children, disabled = false }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return <Button type="button" variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} disabled={disabled}>{children}</Button>
}

export function PostComposer({ postId, initialContent, platform = "x", clusterTitle = "Demand cluster", maxCharacters = 280 }: { postId: string; initialContent: string; platform?: string; clusterTitle?: string; maxCharacters?: number }) {
  const { locale, t } = useLocale()
  const [saved, setSaved] = useState(true)
  const [characterCount, setCharacterCount] = useState(initialContent.length)
  const [rewrite, setRewrite] = useState<string | null>(null)
  const [customInstruction, setCustomInstruction] = useState("")
  const [rewriteError, setRewriteError] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor: updatedEditor }) => {
      setCharacterCount(updatedEditor.getText().length)
      setSaved(false)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        const response = await fetch(`/api/posts/${postId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ editorJson: updatedEditor.getJSON(), plainText: updatedEditor.getText() }) })
        setSaved(response.ok)
      }, 700)
    },
  })

  async function save() {
    if (!editor) return
    const response = await fetch(`/api/posts/${postId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ editorJson: editor.getJSON(), plainText: editor.getText() }) })
    setSaved(response.ok)
  }

  async function requestRewrite(instruction: string) {
    setRewriteError(null)
    const response = await fetch(`/api/posts/${postId}/rewrite`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ instruction }) })
    const result = await response.json()
    if (!response.ok) return setRewriteError(result.error ?? "Rewrite failed. Try again.")
    setRewrite(result.preview.body)
  }

  function acceptRewrite() {
    if (!editor || !rewrite) return
    editor.commands.setContent(rewrite)
    setRewrite(null)
    setSaved(false)
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Badge variant="outline">{platform}</Badge><span className="text-xs text-muted-foreground">{locale === "ru" ? "Из" : "From"} “{clusterTitle}”</span></div><span className="flex items-center gap-2 text-xs text-muted-foreground"><span className={cn("size-1.5 rounded-full", saved ? "bg-foreground" : "bg-muted-foreground")} aria-hidden />{t(saved ? "Saved just now" : "Unsaved changes")}</span></div>
        <div className="overflow-hidden border">
          <div className="flex flex-wrap items-center gap-1 border-b bg-muted/20 p-2" aria-label={locale === "ru" ? "Панель форматирования" : "Rich text toolbar"}>
            <EditorButton label="Undo" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()}><Undo2 aria-hidden /></EditorButton>
            <EditorButton label="Redo" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()}><Redo2 aria-hidden /></EditorButton>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <EditorButton label="Bold" onClick={() => editor?.chain().focus().toggleBold().run()}><Bold aria-hidden /></EditorButton>
            <EditorButton label="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic aria-hidden /></EditorButton>
            <EditorButton label="Inline code" onClick={() => editor?.chain().focus().toggleCode().run()}><Code2 aria-hidden /></EditorButton>
            <EditorButton label="Add link" onClick={() => { const url = window.prompt("Link URL"); if (url) editor?.chain().focus().setLink({ href: url }).run() }}><Link2 aria-hidden /></EditorButton>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <EditorButton label="Bulleted list" onClick={() => editor?.chain().focus().toggleBulletList().run()}><List aria-hidden /></EditorButton>
            <EditorButton label="Numbered list" onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered aria-hidden /></EditorButton>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <Tooltip><TooltipTrigger asChild><span tabIndex={0}><Button type="button" variant="ghost" size="sm" disabled><ImagePlus data-icon="inline-start" /> {locale === "ru" ? "Создать изображение" : "Generate image"}</Button></span></TooltipTrigger><TooltipContent>{locale === "ru" ? "Скоро" : "Coming soon"}</TooltipContent></Tooltip>
          </div>
          <EditorContent editor={editor} className="tiptap min-h-72 p-5 text-base leading-7 outline-none sm:p-7" aria-label={locale === "ru" ? "Редактор публикации" : "Post editor"} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground"><span>{characterCount} / {maxCharacters} {locale === "ru" ? "символов" : "characters"}</span><div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" onClick={save}>{t("Save draft")}</Button><Button type="button" size="sm" onClick={save}>{t("Publish later")}</Button></div></div>
        </div>
        {rewrite ? <div className="mt-5 border-l-2 border-foreground bg-muted/40 p-4"><div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.1em]"><WandSparkles aria-hidden /> {t("Rewrite preview")}</p><Badge variant="outline">{locale === "ru" ? "Не применено" : "Not applied"}</Badge></div><p className="mt-3 text-sm leading-6">{rewrite}</p><div className="mt-4 flex gap-2"><Button type="button" size="sm" onClick={acceptRewrite}>{locale === "ru" ? "Принять вариант" : "Accept rewrite"}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setRewrite(null)}>{locale === "ru" ? "Отклонить" : "Reject"}</Button></div></div> : null}
      </section>
      <aside className="flex flex-col gap-7 lg:border-l lg:pl-7">
        <div><p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{t("Rewrite with AI")}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{locale === "ru" ? "Выберите направление, сравните результат и примите или отклоните его. Исходный черновик не изменится без вашего решения." : "Try a direction, compare the result, then accept or reject it. The source draft stays untouched until you choose."}</p></div>
        <FieldGroup>
          <Field><FieldLabel htmlFor="rewrite-style">{t("Direction")}</FieldLabel><Select defaultValue="technical"><SelectTrigger id="rewrite-style" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="technical">{locale === "ru" ? "Техничнее" : "More technical"}</SelectItem><SelectItem value="shorter">{t("Shorter")}</SelectItem><SelectItem value="stronger">{t("Stronger")}</SelectItem><SelectItem value="less-promotional">{locale === "ru" ? "Меньше рекламы" : "Less promotional"}</SelectItem></SelectGroup></SelectContent></Select></Field>
          <Field><FieldLabel htmlFor="custom-instruction">{t("Custom instruction")}</FieldLabel><Textarea id="custom-instruction" value={customInstruction} onChange={(event) => setCustomInstruction(event.target.value)} placeholder={locale === "ru" ? "Сделай текст техничнее и убери маркетинговые формулировки." : "Make this more technical and remove the marketing language."} rows={4} /><FieldDescription>{customInstruction.length} {locale === "ru" ? "символов" : "characters"}</FieldDescription></Field>
        </FieldGroup>
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => requestRewrite("Make it shorter.")}>{t("Shorter")}</Button><Button type="button" variant="outline" size="sm" onClick={() => requestRewrite("Make it stronger without becoming promotional.")}>{t("Stronger")}</Button><Button type="button" variant="outline" size="sm" onClick={() => requestRewrite(customInstruction || "Make it more technical and less promotional.")}>{t("Rewrite preview")}</Button></div>
        {rewriteError ? <p className="text-xs leading-5 text-destructive">{rewriteError}</p> : null}
        <div className="border-t pt-5"><p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{t("Platform constraints")}</p><dl className="mt-3 flex flex-col gap-2 text-xs"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("Channel")}</dt><dd>{platform}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("Tone")}</dt><dd>{locale === "ru" ? "Прямой, технический" : "Direct, technical"}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("Remaining")}</dt><dd>{Math.max(0, maxCharacters - characterCount)} {locale === "ru" ? "символов" : "characters"}</dd></div></dl></div>
      </aside>
    </div>
  )
}
