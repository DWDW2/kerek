'use client';
import { useState } from 'react';
import Editor from "@monaco-editor/react"

export default function Home() {
  const [code, setCode] = useState<string | undefined>(undefined);
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('');

  async function runCode() {
    const response = await fetch('/api/run-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', "authorization": `Bearer ${window.localStorage.getItem("auth_token")}`},
      body: JSON.stringify({ code, language, stdin: '' }),
    });
    const data = await response.json();
    setOutput(data.stdout || data.stderr || data.exception || data.error || 'No output');
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <select onChange={e => setLanguage(e.target.value)} value={language}>
        <option value="python">Python</option>
        <option value="javascript">JavaScript</option>
        <option value="java">Java</option>
      </select>
		<Editor 
			language={language}

		/> 	
      <button onClick={runCode} style={{ marginTop: 10 }}>Run Code</button>
      <pre style={{ backgroundColor: '#1e1e1e', color: 'white', padding: 10, height: '20vh', overflow: 'auto' }}>
        {output}
      </pre>
    </div>
  );
}

