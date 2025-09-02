"use client"

import { useState } from "react"

interface VirtualFaceProps {
  emotion: string
  isThinking?: boolean
  size?: "small" | "medium" | "large" // Added size prop for different display contexts
}

export function VirtualFace({ emotion, isThinking, size = "large" }: VirtualFaceProps) {
  const [blinkAnimation, setBlinkAnimation] = useState(false)

  // Blink animation
  const getSizeConfig = (size: string) => {
    switch (size) {
      case "small":
        return { width: 48, height: 48, showLabel: false }
      case "medium":
        return { width: 120, height: 120, showLabel: true }
      case "large":
      default:
        return { width: 200, height: 200, showLabel: true }
    }
  }

  const sizeConfig = getSizeConfig(size)

  const getEmotionStyles = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case "happy":
      case "joy":
        return {
          eyeShape: "M 10 15 O 15 10 20 15",
          mouthShape: "M 10 28 Q 20 35 30 28", // Adjusted mouth position
          eyebrowY: 12,
          cheekColor: "#ffb3ba",
        }
      case "sad":
      case "sadness":
        return {
          eyeShape: "M 10 18 O 15 15 20 18",
          mouthShape: "M 10 30 Q 20 25 30 30", // Adjusted mouth position
          eyebrowY: 15,
          cheekColor: "#e6f3ff",
        }
      case "angry":
      case "anger":
        return {
          eyeShape: "M 10 16 O 15 14 20 16", // Fixed eye shape
          mouthShape: "M 10 30 Q 20 25 30 30", // Adjusted mouth position
          eyebrowY: 10,
          cheekColor: "#ffcccb",
        }
      case "surprised":
      case "surprise":
        return {
          eyeShape: "circle",
          mouthShape: "M 15 28 Q 20 35 25 28", // Adjusted mouth position
          eyebrowY: 8,
          cheekColor: "#fff2cc",
        }
      case "fear":
      case "fearful":
        return {
          eyeShape: "M 10 15 O 15 12 20 15", // Fixed eye shape
          mouthShape: "M 12 30 Q 20 33 28 30", // Adjusted mouth position
          eyebrowY: 9,
          cheekColor: "#f0f0f0",
        }
      case "disgust":
        return {
          eyeShape: "M 10 16 O 15 14 20 16", // Fixed eye shape
          mouthShape: "M 12 28 Q 20 25 28 28", // Adjusted mouth position
          eyebrowY: 11,
          cheekColor: "#e6ffe6",
        }
      default: // neutral
        return {
          eyeShape: "M 10 16 O 15 14 20 16", // Fixed eye shape
          mouthShape: "M 15 30 L 25 30", // Adjusted mouth position
          eyebrowY: 12,
          cheekColor: "#f9f9f9",
        }
    }
  }

  const styles = getEmotionStyles(emotion)

  return (
    <div className="relative">
      <svg width={sizeConfig.width} height={sizeConfig.height} viewBox="0 0 40 40" className="drop-shadow-lg">
        {/* Face */}
        <circle cx="20" cy="20" r="18" fill="#fdbcb4" stroke="#e8a598" strokeWidth="0.5" />

        {/* Cheeks */}
        <circle cx="12" cy="22" r="3" fill={styles.cheekColor} opacity="0.6" />
        <circle cx="28" cy="22" r="3" fill={styles.cheekColor} opacity="0.6" />

        {/* Eyebrows */}
        <path
          d={`M 8 ${styles.eyebrowY} Q 12 ${styles.eyebrowY - 1} 16 ${styles.eyebrowY}`}
          stroke="#8b4513"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M 24 ${styles.eyebrowY} Q 28 ${styles.eyebrowY - 1} 32 ${styles.eyebrowY}`}
          stroke="#8b4513"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Eyes */}
        {blinkAnimation ? (
          <>
            <line x1="8" y1="16" x2="16" y2="16" stroke="#333" strokeWidth="2" strokeLinecap="round" />
            <line x1="24" y1="16" x2="32" y2="16" stroke="#333" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : styles.eyeShape === "circle" ? (
          <>
            <circle cx="12" cy="16" r="3" fill="white" />
            <circle cx="12" cy="16" r="1.5" fill="#333" />
            <circle cx="28" cy="16" r="3" fill="white" />
            <circle cx="28" cy="16" r="1.5" fill="#333" />
          </>
        ) : (
          <>
            <ellipse cx="12" cy="16" rx="4" ry="3" fill="white" />
            <path
              d={styles.eyeShape.replace("15", "12")}
              stroke="#333"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="12" cy="16" r="1.5" fill="#333" />

            <ellipse cx="28" cy="16" rx="4" ry="3" fill="white" />
            <path
              d={styles.eyeShape.replace("15", "28")}
              stroke="#333"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="28" cy="16" r="1.5" fill="#333" />
          </>
        )}

        {/* Nose */}
        <path d="M 18 20 Q 20 22 22 20" stroke="#e8a598" strokeWidth="1" fill="none" />

        {/* Mouth */}
        <path d={styles.mouthShape} stroke="#d63384" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Thinking indicator */}
        {isThinking && (
          <g>
            <circle cx="35" cy="8" r="1" fill="#666" opacity="0.7">
              <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1s" repeatCount="indefinite" />
            </circle>
            <circle cx="37" cy="6" r="0.8" fill="#666" opacity="0.5">
              <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="39" cy="4" r="0.6" fill="#666" opacity="0.3">
              <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.4s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>

      <div className="text-center mt-2">
        <p className="text-sm text-gray-600 capitalize">{isThinking ? "Thinking..." : emotion}</p>
      </div>
    </div>
  )
}
