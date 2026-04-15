import {useEffect, useRef, useState} from "react";

function formatDisplay(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0")
    const s = (seconds % 60).toString().padStart(2, "0")
    return `${m}:${s}`
}

function formatMessage(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    const parts: string[] = []
    if (m > 0) parts.push(`${m} minute${m !== 1 ? "s" : ""}`)
    if (s > 0 || m === 0) parts.push(`${s} second${s !== 1 ? "s" : ""}`)
    return parts.join(" and ")
}

/**
 * Increment `startSignal` to (re)start the stopwatch.
 * The component renders nothing until the first start.
 */
export function Stopwatch({startSignal}: {startSignal: number}) {
    const [elapsed, setElapsed] = useState(0)
    const [running, setRunning] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const prevSignal = useRef(0)

    // Start / restart whenever the parent increments startSignal
    useEffect(() => {
        if (startSignal > prevSignal.current) {
            prevSignal.current = startSignal
            setElapsed(0)
            setRunning(true)
            setMessage(null)
        }
    }, [startSignal])

    // Tick every second while running
    useEffect(() => {
        if (!running) return
        const id = setInterval(() => setElapsed(e => e + 1), 1000)
        return () => clearInterval(id)
    }, [running])

    function stop() {
        setRunning(false)
        setMessage(formatMessage(elapsed))
    }

    // Nothing to show before first start
    if (startSignal === 0 && !running && !message) return null

    return (
        <div className="mt-4 flex items-center gap-3 flex-wrap">
            {running && (
                <>
                    <span className="font-mono text-2xl font-semibold text-gray-900 tracking-widest">
                        {formatDisplay(elapsed)}
                    </span>
                    <button
                        type="button"
                        onClick={stop}
                        className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Stop
                    </button>
                </>
            )}
            {!running && message && (
                <p className="text-sm font-medium text-gray-700">
                    Your cooking time was <span className="text-gray-900 font-semibold">{message}</span>.
                </p>
            )}
        </div>
    )
}
