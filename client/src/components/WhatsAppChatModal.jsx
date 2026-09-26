import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Phone,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Sparkles,
  FileText,
  ShieldCheck,
  Play,
  Pause,
  Download,
  MoreVertical,
  Search
} from 'lucide-react';
import { getLeadWhatsAppMessages, sendLeadWhatsAppMessage } from '../services/api';
import { redirectToWhatsAppWeb } from '../utils/whatsapp';

export default function WhatsAppChatModal({ student, onClose }) {
  if (!student) return null;

  const rawLead = student.rawLead || student;
  const leadId = student.id || student._id || rawLead._id || rawLead.id;
  const studentName = student.name || rawLead.fullName || 'Student';
  const rawPhone = student.phone || rawLead.phone || '';
  const cleanPhone = String(rawPhone).replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : (rawPhone || 'Not available');
  const course = rawLead.course || student.course || 'Medical Coding (CPC)';
  const education = rawLead.education || student.education || rawLead.category || 'Graduate';
  const counselor = rawLead.counselorAssigned || 'Counsellor';

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playingAudioId, setPlayingAudioId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch or initialize WhatsApp conversation from backend MongoDB
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    if (leadId) {
      getLeadWhatsAppMessages(leadId)
        .then((res) => {
          if (isMounted && res && res.messages) {
            setMessages(res.messages);
          }
        })
        .catch((err) => {
          console.warn('Could not load the WhatsApp log:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [leadId, cleanPhone, studentName, course]);

  // Quick 1-click counseling reply templates
  const QUICK_TEMPLATES = [
    {
      label: '📋 Course Details',
      text: `Hi ${studentName}! Our ${course} training includes 100% live interactive classes, AAPC certified curriculum, daily mock tests, and 100% placement support in top healthcare MNCs.`
    },
    {
      label: '🎯 Free Demo Invite',
      text: `Hi ${studentName}, we have a Free Live Demo Session scheduled tomorrow at 7:00 PM with our Senior AAPC Certified Trainer. Shall I book your slot?`
    },
    {
      label: '💰 Fee & EMI Options',
      text: `Hi ${studentName}, shall I share the fee and instalment options for the ${course} program?`
    },
    {
      label: '📄 Document Checklist',
      text: `Hi ${studentName}, to proceed with your enrollment, please share a soft copy of your Degree / Provisional marksheet and Aadhaar card front & back.`
    },
    {
      label: '⏰ Follow-up Check',
      text: `Hi ${studentName}, hope you're having a good day! Just checking in to see if you have any questions regarding the Medical Coding program. Are you free for a quick 5-min call?`
    }
  ];

  // Quick emoji set
  const EMOJIS = ['👍', '👋', '🎯', '📋', '✅', '😊', '🙏', '🎓', '🏥', '💼'];

  // Handle sending a message
  const handleSendMessage = async (textToSend, mediaObj = null) => {
    const text = (typeof textToSend === 'string' ? textToSend : inputText).trim();
    if (!text && !mediaObj) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const clientMsg = {
      id: `wa-temp-${Date.now()}`,
      sender: 'counselor',
      senderName: counselor,
      text: text,
      time: timeStr,
      status: 'sent', // single tick
      mediaUrl: mediaObj?.url || '',
      mediaType: mediaObj?.type || '',
      mediaName: mediaObj?.name || '',
      createdAt: now
    };

    // This panel is a log — the message itself is sent from WhatsApp
    setMessages((prev) => [...prev, clientMsg]);
    setInputText('');
    setShowEmojiPicker(false);
    setShowAttachMenu(false);

    if (text && cleanPhone) redirectToWhatsAppWeb(cleanPhone, text);

    try {
      if (leadId) {
        const res = await sendLeadWhatsAppMessage(leadId, {
          text: clientMsg.text,
          mediaUrl: clientMsg.mediaUrl,
          mediaType: clientMsg.mediaType,
          mediaName: clientMsg.mediaName,
          sender: 'counselor',
          senderName: counselor
        });
        if (res && res.messages) setMessages(res.messages);
      }
    } catch (err) {
      console.warn('Could not save the WhatsApp log:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Attach sample documents
  const handleAttachDocument = (type) => {
    setShowAttachMenu(false);
    if (type === 'syllabus') {
      handleSendMessage('', {
        url: '#',
        type: 'pdf',
        name: 'ThoughtFlows_CPC_Medical_Coding_Syllabus_2026.pdf'
      });
    } else if (type === 'fee') {
      handleSendMessage('', {
        url: '#',
        type: 'pdf',
        name: 'CPC_Course_Fee_Structure_&_EMI_Schedule.pdf'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      {/* Modal Dialog Box */}
      <div
        className="w-full max-w-xl h-[640px] max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* WhatsApp Signature Dark Teal Header */}
        <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between shadow-md select-none shrink-0">
          <div className="flex items-center gap-3">
            {/* Student Avatar */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-emerald-700 border-2 border-white/50 flex items-center justify-center font-bold text-white text-base shadow-sm">
                {studentName.charAt(0).toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#075e54] rounded-full"></span>
            </div>

            {/* Student Info & Live Status */}
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base tracking-wide text-white drop-shadow-xs">
                  {studentName}
                </h3>
                <span className="text-[9.5px] bg-[#128c7e] text-emerald-100 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Lead
                </span>
              </div>
              <div className="text-[11px] text-emerald-100 flex items-center gap-1.5 mt-0.5">
                {isTyping ? (
                  <span className="text-emerald-200 font-bold italic animate-pulse">
                    typing...
                  </span>
                ) : (
                  <>
                    <span className="font-mono text-emerald-200">{formattedPhone}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {rawPhone && (
              <a
                href={`tel:${cleanPhone}`}
                className="p-2 rounded-full hover:bg-white/15 text-emerald-100 hover:text-white transition-colors"
                title={`Call ${studentName}`}
              >
                <Phone className="w-4 h-4" />
              </a>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/15 text-emerald-100 hover:text-white transition-colors ml-1 cursor-pointer"
              title="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-header info bar */}
        <div className="bg-[#128c7e] text-white/90 px-4 py-1.5 text-[11px] flex items-center justify-between shrink-0 font-medium">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-emerald-200">Course:</span>
            <span className="font-bold text-white truncate">{course}</span>
            <span className="text-emerald-300">({education})</span>
          </div>
          <span className="text-[10.5px] text-emerald-100 font-mono shrink-0">
            Counselor: {counselor}
          </span>
        </div>

        {/* Chat Messages Body with WhatsApp background */}
        <div
          className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#efeae2]"
          style={{
            backgroundImage: `radial-gradient(#dfd7cc 1px, transparent 1px), radial-gradient(#dfd7cc 1px, #efeae2 1px)`,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 10px 10px'
          }}
        >
          {/* WhatsApp End-to-end Encryption Banner */}
          <div className="flex justify-center">
            <div className="bg-[#ffeecd] text-[#54656f] text-[10.5px] px-3.5 py-1.5 rounded-lg shadow-2xs max-w-sm text-center flex items-center gap-1.5 font-medium border border-[#fae2b1] leading-relaxed">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Send opens WhatsApp with your message. Replies arrive in WhatsApp, not here — this panel is your message log.</span>
            </div>
          </div>

          {/* Date pill */}
          <div className="flex justify-center my-1">
            <span className="bg-white/85 backdrop-blur-xs text-slate-500 font-bold uppercase text-[9px] tracking-wider px-2.5 py-0.5 rounded-md shadow-2xs">
              TODAY
            </span>
          </div>

          {/* Messages */}
          {messages.map((msg) => {
            const isCounselor = msg.sender === 'counselor';
            return (
              <div
                key={msg.id}
                className={`flex ${isCounselor ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`relative max-w-[85%] sm:max-w-[78%] rounded-xl px-3 py-2 text-xs shadow-xs leading-relaxed ${
                    isCounselor
                      ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                      : 'bg-white text-slate-900 rounded-tl-none'
                  }`}
                >
                  {/* Sender label */}
                  <div className="text-[10px] font-bold mb-0.5 text-slate-500 flex items-center justify-between gap-3">
                    <span className={isCounselor ? 'text-emerald-800' : 'text-blue-700'}>
                      {isCounselor ? `You (${counselor})` : studentName}
                    </span>
                  </div>

                  {/* PDF Document Attachment Bubble */}
                  {msg.mediaType === 'pdf' && (
                    <div className="my-1.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                        PDF
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11.5px] font-bold text-slate-900 truncate">
                          {msg.mediaName || 'Document.pdf'}
                        </div>
                        <div className="text-[9.5px] text-slate-500">2.4 MB • PDF document</div>
                      </div>
                      <button
                        onClick={() => alert(`Downloading ${msg.mediaName}...`)}
                        className="p-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                        title="Download Document"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Audio Voice Note Bubble */}
                  {msg.mediaType === 'audio' && (
                    <div className="my-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <button
                        onClick={() => setPlayingAudioId(playingAudioId === msg.id ? null : msg.id)}
                        className="w-8 h-8 rounded-full bg-[#128c7e] text-white flex items-center justify-center shadow-xs cursor-pointer"
                      >
                        {playingAudioId === msg.id ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 ml-0.5" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="h-1.5 bg-slate-300 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-emerald-600 transition-all ${
                              playingAudioId === msg.id ? 'w-2/3 animate-pulse' : 'w-0'
                            }`}
                          ></div>
                        </div>
                        <div className="text-[9.5px] text-slate-500 mt-1 font-mono">
                          {playingAudioId === msg.id ? 'Playing 0:08 / 0:14' : 'Voice Message 0:14'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message Content */}
                  {msg.text && (
                    <div className="whitespace-pre-line text-[12px] sm:text-[12.5px] text-slate-800">
                      {msg.text}
                    </div>
                  )}

                  {/* Message timestamp & status ticks */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400 font-mono">
                    <span>{msg.time}</span>
                    {isCounselor && (
                      <>
                        {msg.status === 'sent' && (
                          <Check className="w-3 h-3 text-slate-400" />
                        )}
                        {msg.status === 'delivered' && (
                          <CheckCheck className="w-3 h-3 text-slate-400" />
                        )}
                        {msg.status === 'read' && (
                          <CheckCheck className="w-3 h-3 text-blue-500 font-bold" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Student Typing Indicator Bubble */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white rounded-xl rounded-tl-none px-3.5 py-2 text-xs shadow-xs text-slate-500 flex items-center gap-1.5">
                <span className="font-semibold text-slate-600 text-[11px]">{studentName} is typing</span>
                <span className="flex gap-0.5 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Counseling Templates Chips */}
        <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 shrink-0">
          <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Quick Counseling Templates (1-Click Insert)</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(tmpl.text);
                  inputRef.current?.focus();
                }}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-[11px] font-medium border border-slate-200 hover:border-emerald-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Emoji palette drawer (if opened) */}
        {showEmojiPicker && (
          <div className="bg-slate-100 border-t border-slate-200 px-3 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
            {EMOJIS.map((emoji, i) => (
              <button
                key={i}
                onClick={() => {
                  setInputText((prev) => prev + emoji);
                  inputRef.current?.focus();
                }}
                className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Attachment menu drawer (if opened) */}
        {showAttachMenu && (
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleAttachDocument('syllabus')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Send Course Syllabus PDF</span>
            </button>
            <button
              onClick={() => handleAttachDocument('fee')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Send Fee Structure PDF</span>
            </button>
          </div>
        )}

        {/* Message Input Bar */}
        <div className="bg-white border-t border-slate-200 p-2.5 sm:p-3 flex items-center gap-2 shrink-0">
          {/* Emoji button */}
          <button
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="p-1.5 text-slate-500 hover:text-slate-800 transition-colors rounded-full hover:bg-slate-100 cursor-pointer"
            title="Insert Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Attachment Paperclip */}
          <button
            onClick={() => setShowAttachMenu((prev) => !prev)}
            className="p-1.5 text-slate-500 hover:text-slate-800 transition-colors rounded-full hover:bg-slate-100 cursor-pointer"
            title="Attach Document"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text input */}
          <textarea
            ref={inputRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type a message to ${studentName}... (Enter to send)`}
            className="flex-1 resize-none bg-slate-100 hover:bg-slate-100/80 focus:bg-white border border-transparent focus:border-[#128c7e] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 focus:outline-hidden transition-all max-h-24 leading-normal"
          />

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim()}
            className={`p-2.5 rounded-full flex items-center justify-center transition-all ${
              inputText.trim()
                ? 'bg-[#25d366] hover:bg-[#20bd5a] text-white shadow-md active:scale-95 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title="Send WhatsApp Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
