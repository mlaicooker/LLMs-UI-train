"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { VirtualFace } from "@/components/virtual-face"
import { Loader2, Send, ImagePlus, X, Paperclip, Upload, FileText, Database } from "lucide-react"

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  emotion?: string
  timestamp: Date
  images?: string[] // Added images array for attached images
}

interface EmotionAnalysis {
  emotion: string
  response: string
  image_urls?: string[] // Added image_urls from backend response
}

interface ChatHistoryResponse {
  messages: Array<{
    id: string
    query: string
    response: string
    emotion: string
    timestamp: string
    type: string // Added type field from backend
    images?: string[] // Changed from image_urls to images to match backend
  }>
  hasMore: boolean
  total: number
}

export default function EmotionChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        "Hello! I'm your emotional AI companion. Share your thoughts and feelings with me, and I'll provide empathetic responses while analyzing your emotions. You can also attach images for me to analyze!",
      emotion: "joy",
      timestamp: new Date(),
    },
  ])
  const [inputText, setInputText] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previousScrollHeight, setPreviousScrollHeight] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [showUploadArea, setShowUploadArea] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const trainingFileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!historyLoaded) {
      loadChatHistory(0, true)
    }
  }, [])

  const loadChatHistory = async (page: number, isInitial = false) => {
    if (isLoadingHistory || (!hasMoreHistory && !isInitial)) return

    setIsLoadingHistory(true)

    try {
      const response = await fetch(`http://localhost:8766/chat-history?page=${page}&limit=20`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to load chat history: ${response.status}`)
      }

      const result: ChatHistoryResponse = await response.json()

      if (result.messages.length > 0) {
        // Convert backend format to frontend Message format
        const historyMessages: Message[] = []

        result.messages.forEach((entry) => {
          // Add user message
          historyMessages.push({
            id: `${entry.id}-user`,
            type: "user",
            content: entry.query,
            timestamp: new Date(entry.timestamp),
            images: entry.type === "image" ? entry.images : undefined, // Use images field and check type
          })

          // Add AI response
          historyMessages.push({
            id: `${entry.id}-ai`,
            type: "ai",
            content: entry.response,
            emotion: entry.emotion,
            timestamp: new Date(entry.timestamp),
          })
        })

        if (isInitial) {
          // Replace welcome message with actual history
          setMessages([...historyMessages])
        } else {
          // Prepend older messages to the beginning
          setMessages((prev) => [...historyMessages, ...prev])
        }

        setCurrentPage(page + 1)
        setHasMoreHistory(result.hasMore)
      } else {
        setHasMoreHistory(false)
      }

      setHistoryLoaded(true)
    } catch (error) {
      console.error("Error loading chat history:", error)
      // Don't show error for history loading, just stop trying
      setHasMoreHistory(false)
      setHistoryLoaded(true)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container || isLoadingHistory || !hasMoreHistory) return

    // Load more when scrolled near the top (within 100px)
    if (container.scrollTop < 100) {
      setPreviousScrollHeight(container.scrollHeight)
      loadChatHistory(currentPage)
    }
  }, [isLoadingHistory, hasMoreHistory, currentPage])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container && previousScrollHeight > 0) {
      const newScrollHeight = container.scrollHeight
      const scrollDiff = newScrollHeight - previousScrollHeight
      container.scrollTop = scrollDiff
      setPreviousScrollHeight(0)
    }
  }, [messages, previousScrollHeight])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.addEventListener("scroll", handleScroll)
      return () => container.removeEventListener("scroll", handleScroll)
    }
  }, [handleScroll])

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const handleImageSelect = async (files: FileList | null) => {
    if (!files) return

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"))

    if (imageFiles.length === 0) {
      setError("Please select valid image files.")
      return
    }

    try {
      const base64Images = await Promise.all(imageFiles.map(convertToBase64))
      setAttachedImages((prev) => [...prev, ...base64Images])
      setError(null)
    } catch (error) {
      console.error("Error converting images:", error)
      setError("Failed to process images. Please try again.")
    }
  }

  const handleFileInputClick = () => {
    fileInputRef.current?.click()
  }

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleImageSelect(e.dataTransfer.files)
  }

  const getCurrentEmotion = () => {
    const lastAiMessage = messages.filter((m) => m.type === "ai").pop()
    return lastAiMessage?.emotion || "neutral"
  }

  const sendMessage = async () => {
    if (!inputText.trim() && attachedImages.length === 0) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputText.trim() || "Analyze these images",
      timestamp: new Date(),
      images: attachedImages.length > 0 ? [...attachedImages] : undefined, // Added images to user message
    }

    setMessages((prev) => [...prev, userMessage])
    setInputText("")
    const currentImages = [...attachedImages]
    setAttachedImages([]) // Clear attached images after sending
    setIsAnalyzing(true)
    setError(null)

    try {
      const endpoint = currentImages.length > 0 ? "http://localhost:8766/image-rag" : "http://localhost:8766/rag"
      const requestBody =
        currentImages.length > 0
          ? { images: currentImages, query: userMessage.content }
          : { query: userMessage.content }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Failed to analyze: ${response.status}`)
      }

      const result: EmotionAnalysis = await response.json()

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: result.response,
        emotion: result.emotion,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error("Error analyzing:", error)
      setError(
        "Unable to connect to the analysis service. Please make sure your Python backend is running on port 8766.",
      )

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: "I'm sorry, I'm having trouble connecting to my analysis service right now. Please try again later.",
        emotion: "sadness",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleTrainingFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    const isJson = file.type === "application/json" || file.name.endsWith(".json")
    const isText = file.type === "text/plain" || file.name.endsWith(".txt")
    const isMarkdown = file.name.endsWith(".md") || file.name.endsWith(".markdown")

    if (!isJson && !isText && !isMarkdown) {
      setError("Please select a JSON, text, or markdown file for training.")
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadSuccess(null)
    setIsTraining(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const endpoint = isJson ? "http://localhost:8766/load-json" : "http://localhost:8766/load-text"

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      const result = await response.json()
      setUploadSuccess(`Successfully uploaded ${file.name} for training!`)

      setTimeout(() => setUploadSuccess(null), 3000)
    } catch (error) {
      console.error("Error uploading training file:", error)
      setError(`Failed to upload ${file.name}. Please make sure your Python backend is running.`)
    } finally {
      setIsUploading(false)
      setIsTraining(false)
    }
  }

  const handleTrainingFileInputClick = () => {
    trainingFileInputRef.current?.click()
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Chat Header with Virtual Companion */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12">
              <VirtualFace emotion={getCurrentEmotion()} isThinking={isAnalyzing} size="small" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Emotional AI Companion</h1>
              <p className="text-sm text-gray-500">{isAnalyzing ? "Analyzing your emotions..." : "Ready to chat"}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="text-xs">
              Emotion: {getCurrentEmotion()}
            </Badge>
            <Button onClick={() => setShowUploadArea(!showUploadArea)} variant="outline" size="sm" className="text-xs">
              <Upload className="w-3 h-3 mr-1" />
              Train Model
            </Button>
          </div>
        </div>
      </div>

      {showUploadArea && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Upload Training Data</h3>
                <Button onClick={() => setShowUploadArea(false)} variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors">
                  <Database className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700 mb-1">JSON Training Data</p>
                  <p className="text-xs text-gray-500 mb-3">Upload structured conversation data</p>
                  <Button
                    onClick={handleTrainingFileInputClick}
                    disabled={isUploading}
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 mr-1" />
                        Select JSON File
                      </>
                    )}
                  </Button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                  <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700 mb-1">Text Training Data</p>
                  <p className="text-xs text-gray-500 mb-3">Upload plain text conversations</p>
                  <Button
                    onClick={handleTrainingFileInputClick}
                    disabled={isUploading}
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 mr-1" />
                        Select Text File
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {uploadSuccess && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  {uploadSuccess}
                </div>
              )}

              {isTraining && (
                <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center justify-center space-x-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Training model...</span>
                  </div>
                  <p className="text-xs text-blue-700 text-center mt-2">
                    Please wait while your training data is being processed.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 p-3">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={messagesContainerRef}
          className={`h-full overflow-y-auto p-4 ${isDragOver ? "bg-blue-50" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="max-w-4xl mx-auto space-y-4">
            {isDragOver && (
              <div className="fixed inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center z-50 pointer-events-none">
                <div className="bg-white rounded-lg p-8 shadow-lg border-2 border-dashed border-blue-400">
                  <div className="flex flex-col items-center space-y-2">
                    <ImagePlus className="w-12 h-12 text-blue-500" />
                    <p className="text-lg font-medium text-blue-700">Drop images here</p>
                    <p className="text-sm text-blue-600">Release to attach images to your message</p>
                  </div>
                </div>
              </div>
            )}

            {isLoadingHistory && (
              <div className="flex justify-center py-4">
                <div className="flex items-center space-x-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading chat history...</span>
                </div>
              </div>
            )}

            {!hasMoreHistory && historyLoaded && messages.length > 1 && (
              <div className="flex justify-center py-2">
                <span className="text-xs text-gray-400">Beginning of conversation</span>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${message.type === "user" ? "order-2" : "order-1"}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.type === "user" ? "bg-indigo-600 text-white" : "bg-white text-gray-900 shadow-sm border"
                    }`}
                  >
                    {message.images && message.images.length > 0 && (
                      <div className="mb-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {message.images.map((image, index) => {
                            let imageSrc = image
                            if (image.startsWith("data:")) {
                              // Base64 image from newly attached files
                              imageSrc = image
                            } else if (image.startsWith("http")) {
                              // Full URL from server
                              imageSrc = image
                            } else {
                              // Relative path from server (chat history)
                              imageSrc = `http://localhost:8766${image}`
                            }

                            return (
                              <img
                                key={index}
                                src={imageSrc || "/placeholder.svg"}
                                alt={`Attached image ${index + 1}`}
                                className="rounded-lg max-w-full h-auto object-cover max-h-32"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = "/placeholder.svg?height=128&width=128"
                                }}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    {message.type === "ai" && message.emotion && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <Badge variant="secondary" className="text-xs">
                          {message.emotion}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <p className={`text-xs text-gray-500 mt-1 ${message.type === "user" ? "text-right" : "text-left"}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isAnalyzing && (
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-md xl:max-w-lg">
                  <div className="bg-white text-gray-900 shadow-sm border rounded-2xl px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-gray-500">
                        {attachedImages.length > 0 ? "Analyzing images and emotions..." : "Analyzing emotions..."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Chat Input */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto">
          {attachedImages.length > 0 && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Attached Images ({attachedImages.length})</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {attachedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image || "/placeholder.svg"}
                      alt={`Attachment ${index + 1}`}
                      className="w-full h-16 object-cover rounded border"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                placeholder={
                  attachedImages.length > 0 ? "Ask about your images..." : "Share your thoughts and feelings..."
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                className="min-h-[44px] max-h-32 resize-none border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                rows={1}
              />
            </div>
            <Button
              onClick={handleFileInputClick}
              variant="outline"
              className="h-11 px-3 bg-transparent"
              disabled={isAnalyzing}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              onClick={sendMessage}
              disabled={(!inputText.trim() && attachedImages.length === 0) || isAnalyzing}
              className="bg-indigo-600 hover:bg-indigo-700 h-11 px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <input
            ref={trainingFileInputRef}
            type="file"
            accept=".json,.txt,.md,.markdown,application/json,text/plain"
            onChange={(e) => handleTrainingFileUpload(e.target.files)}
            className="hidden"
          />
        </div>
      </div>
    </div>
  )
}
