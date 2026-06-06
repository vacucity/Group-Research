"use client";

import { useCallback, useRef } from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";

interface Props {
  content: string;
  onChange: (value: string) => void;
}

export function LatexEditor({ content, onChange }: Props) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const handleChange = useCallback(
    (value: string) => {
      onChange(value);
    },
    [onChange]
  );

  return (
    <div className="flex-1 overflow-hidden">
      <CodeMirror
        ref={editorRef}
        value={content}
        onChange={handleChange}
        extensions={[StreamLanguage.define(stex)]}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          bracketMatching: true,
          closeBrackets: true,
          indentOnInput: true,
        }}
        theme="light"
        className="h-full"
        style={{ height: "100%", fontSize: "14px" }}
      />
    </div>
  );
}
