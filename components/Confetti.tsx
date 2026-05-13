"use client"
import React, { useEffect, useRef } from "react"

interface ConfettiProps { onDone?: () => void }

export default function Confetti({ onDone }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const COLORS = ["#2ECC8A","#ff4455","#ffcc00","#44aaff","#cc66ff","#ff7700","#ffffff","#00ffcc"]
    const pieces: {
      x: number; y: number; r: number; d: number
      color: string; tilt: number; tiltAngle: number; tiltSpeed: number
      shape: "rect" | "circle"
    }[] = []

    for (let i = 0; i < 160; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 8 + 4,
        d: Math.random() * 80 + 20,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        tilt: Math.random() * 10 - 10,
        tiltAngle: 0,
        tiltSpeed: Math.random() * 0.1 + 0.05,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      })
    }

    let frame = 0
    let raf: number

    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++

      pieces.forEach(p => {
        ctx.beginPath()
        ctx.fillStyle = p.color
        if (p.shape === "circle") {
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        } else {
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.tiltAngle)
          ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r)
          ctx.restore()
        }
        ctx.fill()

        p.tiltAngle += p.tiltSpeed
        p.y += (Math.cos(frame * 0.01 + p.d) + 2.5) * 1.8
        p.x += Math.sin(frame * 0.01) * 0.8
        p.tilt = Math.sin(p.tiltAngle) * 12

        if (p.y > canvas.height + 20) {
          p.y = -20
          p.x = Math.random() * canvas.width
        }
      })

      if (frame < 220) {
        raf = requestAnimationFrame(draw)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        onDone?.()
      }
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [onDone])

  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", inset: 0, zIndex: 2000,
      pointerEvents: "none",
    }} />
  )
}
