
"use client";

import dynamic from 'next/dynamic';
import { useMemo, useRef } from 'react';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const quillRef = useRef<any>(null);
  const toolbarId = useMemo(() => `toolbar-${Math.random().toString(36).substring(7)}`, []);

  // Dynamically import ReactQuill to avoid SSR issues
  const ReactQuill = useMemo(
    () => dynamic(async () => {
      const RQModule = await import('react-quill');
      const RQ = RQModule.default;
      // Access Quill from the default export if named export fails
      const Quill = RQ.Quill || (RQModule as any).Quill;

      // Define and Register Custom HR Blot
      if (Quill) {
        const BlockEmbed = Quill.import('blots/block/embed');
        class CardSeparatorBlot extends BlockEmbed {
          static create() {
            const node = super.create();
            node.setAttribute('data-card', 'true');
            // Make it clearly visible in editor
            node.style.border = 'none';
            node.style.borderTop = '2px dashed #ccc';
            node.style.margin = '2rem 0';
            return node;
          }
        }
        CardSeparatorBlot.blotName = 'cardseparator';
        CardSeparatorBlot.tagName = 'hr';

        Quill.register(CardSeparatorBlot, true);
      }

      return ({ forwardedRef, ...props }: any) => <RQ ref={forwardedRef} {...props} />;
    }, { ssr: false }),
    []
  );

  const insertCard = () => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection(true);
      if (range) {
        // Insert the custom separator
        quill.insertEmbed(range.index, 'cardseparator', true, 'user');
        // Insert a new empty line after to allow typing
        quill.setSelection(range.index + 1, 'user');
      }
    }
  };

  // The insertDivider function is no longer needed as 'cardseparator' replaces its functionality.

  useMemo(() => {
    // Redundant registration removed, managed in dynamic loader above
  }, []);

  // Custom Toolbar Modules
  const modules = useMemo(() => ({
    toolbar: {
      container: `#${toolbarId}`,
      handlers: {
        card: insertCard,
        // Remove 'divider' handler if we are only using card
      }
    }
  }), [toolbarId]);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block',
    'list', 'bullet', 'indent', 'script',
    'link', 'image', 'video', 'color', 'background', 'align', 'direction',
    'cardseparator' // Updated format name
  ];

  return (
    <div className={`rich-text-editor flex flex-col bg-card border rounded-md ${className}`}>
      {/* Custom Toolbar Definition */}
      <div id={toolbarId} className="sticky top-0 z-50 bg-card border-b p-2 flex flex-wrap gap-2 items-center text-foreground">
        <select className="ql-header" defaultValue="" onChange={e => { e.persist() }}>
          <option value="1" />
          <option value="2" />
          <option value="3" />
          <option value="" />
        </select>
        <span className="ql-formats">
          <button className="ql-bold" />
          <button className="ql-italic" />
          <button className="ql-underline" />
          <button className="ql-strike" />
        </span>
        <span className="ql-formats">
          <select className="ql-color">
            <option value="rgb(0, 0, 0)" />
            <option value="rgb(230, 0, 0)" />
            <option value="rgb(255, 153, 0)" />
            <option value="rgb(255, 255, 0)" />
            <option value="rgb(0, 138, 0)" />
            <option value="rgb(0, 102, 204)" />
            <option value="rgb(153, 51, 255)" />
            <option value="rgb(255, 255, 255)" />
            <option value="rgb(250, 204, 204)" />
            <option value="rgb(255, 235, 204)" />
            <option value="rgb(255, 255, 204)" />
            <option value="rgb(204, 232, 204)" />
            <option value="rgb(204, 224, 245)" />
            <option value="rgb(235, 214, 255)" />
            <option value="rgb(187, 187, 187)" />
            <option value="rgb(102, 185, 102)" />
            <option value="rgb(88, 88, 88)" />
            <option value="rgb(161, 161, 161)" />
            <option value="rgb(102, 102, 102)" />
            <option value="rgb(51, 51, 51)" />
          </select>
          <select className="ql-background">
            <option value="rgb(0, 0, 0)" />
            <option value="rgb(230, 0, 0)" />
            <option value="rgb(255, 153, 0)" />
            <option value="rgb(255, 255, 0)" />
            <option value="rgb(0, 138, 0)" />
            <option value="rgb(0, 102, 204)" />
            <option value="rgb(153, 51, 255)" />
            <option value="rgb(255, 255, 255)" />
            <option value="rgb(250, 204, 204)" />
            <option value="rgb(255, 235, 204)" />
            <option value="rgb(255, 255, 204)" />
            <option value="rgb(204, 232, 204)" />
            <option value="rgb(204, 224, 245)" />
            <option value="rgb(235, 214, 255)" />
            <option value="rgb(187, 187, 187)" />
            <option value="rgb(102, 185, 102)" />
            <option value="rgb(88, 88, 88)" />
            <option value="rgb(161, 161, 161)" />
            <option value="rgb(102, 102, 102)" />
            <option value="rgb(51, 51, 51)" />
          </select>
        </span>
        <span className="ql-formats">
          <button className="ql-list" value="ordered" />
          <button className="ql-list" value="bullet" />
          <button className="ql-indent" value="-1" />
          <button className="ql-indent" value="+1" />
        </span>
        <span className="ql-formats">
          <select className="ql-align" />
        </span>
        <span className="ql-formats">
          <button className="ql-blockquote" />
          <button className="ql-code-block" />
          <button className="ql-link" />
          <button className="ql-image" />
        </span>
        <span className="ql-formats">
          <button className="ql-clean" />
        </span>
        <span className="ql-formats border-l pl-2 ml-2">
          {/* Explicit Add Card Button */}
          <button className="ql-card">
            + Card
          </button>
        </span>
      </div>

      <div className="flex-grow min-h-[500px] h-full">
        <ReactQuill
          forwardedRef={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          className="h-full flex flex-col"
        />
      </div>

      <style jsx global>{`
                /* Override Quill Styles for Theme Compatibility */
                .rich-text-editor .ql-container.ql-snow {
                    border: none;
                    font-size: 16px;
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                }
                .rich-text-editor .ql-editor {
                    flex-grow: 1;
                    padding: 1rem;
                    min-height: 500px;
                    color: hsl(var(--foreground));
                }
                .ql-snow .ql-stroke {
                    stroke: hsl(var(--foreground));
                }
                .ql-snow .ql-fill {
                    fill: hsl(var(--foreground));
                }
                .ql-snow .ql-picker {
                    color: hsl(var(--foreground));
                }
                /* Ensure Card Button is Visible */
                .rich-text-editor .ql-card {
                    display: inline-flex !important;
                    width: auto !important;
                }
                /* Fix Color Picker Visibility and Background */
                .ql-snow .ql-picker-options {
                    background-color: hsl(var(--card)) !important;
                    border: 1px solid hsl(var(--border)) !important;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    z-index: 100 !important;
                }
                .ql-snow .ql-picker-item {
                    color: hsl(var(--foreground));
                }
                .ql-snow .ql-picker-item:hover {
                    color: hsl(var(--primary));
                    font-weight: bold;
                }
            `}</style>
    </div>
  );
}
