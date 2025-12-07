import React, { useState, useRef } from 'react';
import { generateChibiStyle } from './services/geminiService';
import { AppStatus } from './types';
import { UploadIcon, MagicIcon, DownloadIcon, AlertCircle, ArrowRight } from './components/Icons';
import { Spinner } from './components/Spinner';

// Prompt for when both Style and Content images are present
const PROMPT_WITH_STYLE = "参考第一张图片的艺术风格（包括线条风格、上色方式、Q版比例），将第二张图片中的人物重新绘制为一个贴纸。保持人物的原始发色、发型和服装特征，但将其转化为参考图中的Q版/Chibi风格。确保人物佩戴酷酷的黑色墨镜，表情自信微笑。使用极简矢量艺术风格，粗线条，平涂上色。白色背景。";

// Prompt for when only Content image is present
const PROMPT_SINGLE = "将这张图片中的人物重新绘制为一个Q版/Chibi风格的贴纸。保持人物的原始发色、发型和服装特征。确保人物佩戴酷酷的黑色墨镜，表情自信微笑。使用极简矢量艺术风格，粗线条，平涂上色。白色背景。";

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [contentImage, setContentImage] = useState<string | null>(null);
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>(PROMPT_SINGLE);
  
  const contentInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'content' | 'style') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setErrorMsg("请上传有效的图片文件。");
      return;
    }

    // Validate size (max 5MB roughly to be safe with base64 overhead)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("文件过大，请使用 5MB 以下的图片。");
      return;
    }

    // Reset error when a new valid file is picked
    setErrorMsg(null);
    if (type === 'content') setResultImage(null); // Clear result if content changes

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'content') {
        setContentImage(reader.result as string);
      } else {
        setStyleImage(reader.result as string);
        // Switch to style prompt if currently on single prompt
        setPrompt(prev => prev === PROMPT_SINGLE ? PROMPT_WITH_STYLE : prev);
      }
    };
    reader.onerror = () => {
      setErrorMsg("读取文件失败。");
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!contentImage) {
      setErrorMsg("请至少上传人物原图。");
      return;
    }

    setStatus(AppStatus.GENERATING);
    setErrorMsg(null);

    try {
      const generatedImg = await generateChibiStyle(contentImage, styleImage, prompt);
      setResultImage(generatedImg);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      setErrorMsg(err.message || "生成过程中出现了问题。");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = 'chibi-style.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearImage = (type: 'content' | 'style') => {
    if (type === 'content') {
      setContentImage(null);
      setResultImage(null);
      if (contentInputRef.current) contentInputRef.current.value = '';
    } else {
      setStyleImage(null);
      if (styleInputRef.current) styleInputRef.current.value = '';
      // Switch back to single prompt if currently on style prompt
      setPrompt(prev => prev === PROMPT_WITH_STYLE ? PROMPT_SINGLE : prev);
    }
    setStatus(AppStatus.IDLE);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <MagicIcon />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              Chibify 风格转换器
            </h1>
          </div>
          <div className="text-sm text-slate-400 hidden sm:block">
            由 Gemini 2.5 驱动
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          
          {/* Left Column: Input */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">上传图片</h2>
              <p className="text-slate-400">请上传风格参考图（可选）和需要转换的人物图。</p>
            </div>

            {/* Upload Area Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Style Reference Upload */}
              <div 
                className={`relative group border-2 border-dashed rounded-2xl p-4 transition-all duration-300 ease-in-out h-64 flex flex-col items-center justify-center
                  ${styleImage 
                    ? 'border-indigo-500/50 bg-slate-800/50' 
                    : 'border-slate-700 hover:border-indigo-400 hover:bg-slate-800/30 cursor-pointer'
                  }`}
                onClick={() => !styleImage && styleInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={styleInputRef} 
                  onChange={(e) => handleFileChange(e, 'style')} 
                  className="hidden" 
                  accept="image/*"
                />

                {styleImage ? (
                  <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900">
                    <img 
                      src={styleImage} 
                      alt="Style Reference" 
                      className="w-full h-full object-contain opacity-80"
                    />
                    <div className="absolute top-2 left-2 bg-indigo-600/90 text-white text-xs px-2 py-1 rounded">风格参考</div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        clearImage('style');
                      }}
                      className="absolute top-2 right-2 bg-slate-900/80 hover:bg-red-500/90 text-white p-1.5 rounded-full transition-colors backdrop-blur-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 text-center">
                    <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-colors">
                      <UploadIcon />
                    </div>
                    <p className="font-medium text-sm mb-1">风格参考图</p>
                    <p className="text-xs text-slate-500">上传你想模仿的风格<br/>(可选)</p>
                  </div>
                )}
              </div>

              {/* Content Upload */}
              <div 
                className={`relative group border-2 border-dashed rounded-2xl p-4 transition-all duration-300 ease-in-out h-64 flex flex-col items-center justify-center
                  ${contentImage 
                    ? 'border-indigo-500/50 bg-slate-800/50' 
                    : 'border-slate-700 hover:border-indigo-400 hover:bg-slate-800/30 cursor-pointer'
                  }`}
                onClick={() => !contentImage && contentInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={contentInputRef} 
                  onChange={(e) => handleFileChange(e, 'content')} 
                  className="hidden" 
                  accept="image/*"
                />

                {contentImage ? (
                  <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900">
                    <img 
                      src={contentImage} 
                      alt="Original" 
                      className="w-full h-full object-contain"
                    />
                     <div className="absolute top-2 left-2 bg-indigo-600/90 text-white text-xs px-2 py-1 rounded">人物原图</div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        clearImage('content');
                      }}
                      className="absolute top-2 right-2 bg-slate-900/80 hover:bg-red-500/90 text-white p-1.5 rounded-full transition-colors backdrop-blur-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 text-center">
                    <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-colors">
                      <UploadIcon />
                    </div>
                    <p className="font-medium text-sm mb-1">人物原图</p>
                    <p className="text-xs text-slate-500">上传你想转换的人物<br/>(必须)</p>
                  </div>
                )}
              </div>

            </div>

            {/* Controls */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  风格描述 (Prompt)
                </label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full h-28 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                  placeholder="描述你想要生成的风格..."
                />
                 <p className="text-xs text-slate-500 mt-2">
                   {styleImage ? "提示词已针对双图（风格参考+原图）模式优化。" : "提示词已针对单图（原图）模式优化。"}
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!contentImage || status === AppStatus.GENERATING}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all
                  ${!contentImage || status === AppStatus.GENERATING
                    ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 active:scale-[0.98]'
                  }`}
              >
                {status === AppStatus.GENERATING ? (
                  <>
                    <Spinner />
                    正在转换中...
                  </>
                ) : (
                  <>
                    <MagicIcon />
                    生成 Q 版风格
                  </>
                )}
              </button>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm">
                  <AlertCircle />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Result */}
          <div className="relative">
            <div className="hidden lg:flex absolute top-1/2 -left-6 transform -translate-y-1/2 z-10 bg-slate-800 border border-slate-700 p-2 rounded-full text-slate-400">
               <ArrowRight />
            </div>

            <div className="space-y-6 h-full flex flex-col">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">生成结果</h2>
                <p className="text-slate-400">转换后的 Q 版形象将显示在这里。</p>
              </div>

              <div className="flex-1 bg-slate-800/30 border border-slate-700 rounded-2xl p-8 flex items-center justify-center min-h-[400px] relative overflow-hidden">
                {resultImage ? (
                  <div className="relative w-full h-full flex items-center justify-center animate-in fade-in duration-700">
                     <img 
                      src={resultImage} 
                      alt="Generated Result" 
                      className="max-w-full max-h-[500px] object-contain rounded-lg shadow-2xl shadow-black/50"
                    />
                    <div className="absolute top-0 right-0 p-4">
                       <button
                        onClick={handleDownload}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-lg shadow-lg flex items-center gap-2 font-medium transition-all"
                      >
                        <DownloadIcon />
                        下载图片
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-500">
                    {status === AppStatus.GENERATING ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                        <p className="animate-pulse">AI 正在绘图...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 opacity-50">
                        <div className="w-24 h-24 rounded-2xl bg-slate-700/50 flex items-center justify-center">
                          <MagicIcon />
                        </div>
                        <p>结果将在此处显示</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;