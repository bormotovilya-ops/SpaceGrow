import React from 'react'

function Scorm() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100 mb-2">SCORM-курс</h1>
        <p className="text-zinc-400 text-sm mb-6">
          Презентация (SCORM 2004). Контент загружается из папки /SCORM.
        </p>

        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
          <iframe
            src="/SCORM/res/index.html"
            title="SCORM курс"
            className="w-full border-0"
            style={{ minHeight: '80vh' }}
            allow="fullscreen"
          />
        </div>
      </div>
    </div>
  )
}

export default Scorm
