import React, { useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript, typescriptLanguage } from "@codemirror/lang-javascript";
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';

export function Editor() {
    function showValue() {
        alert(value ?? "No value");
    }

    const [value, setValue] = React.useState("");
    const onChange = React.useCallback((val: string, viewUpdate: any) => {
        console.log("val:", val);
        setValue(val);
    }, []);

    return (
        <>
            <button onClick={showValue}>Show value</button>
            <div className="p-20 ">
                {/* <Editor
                    height="50vh"
                    defaultLanguage="javascript"
                    defaultValue="// some comment"
                    onMount={handleEditorDidMount}
                    className="border-2"
                /> */}
                <CodeMirror
                    value={value}
                    height="200px"
                    extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]}
                    onChange={onChange}
                />
            </div>
        </>
    );
}
