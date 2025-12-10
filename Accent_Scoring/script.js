const mic = document.getElementById("mic");
const micImage = mic.querySelector("img");
const overallScoreElement = document.getElementById("overallScore");
const heavyMispronunciationElement = document.getElementById("heavyMispronunciation");
const lightMispronunciationElement = document.getElementById("lightMispronunciation");
const downloadButton = document.getElementById("downloadButton");
const paragraphBox = document.getElementById("paragraphBox");
const paragraphText = document.getElementById("paragraphText");
const resultsPage = document.getElementById("resultsPage");
const instructionTextElement = document.getElementById("instructionText");
const resultsStatusElement = document.getElementById("resultsStatus");
const countdownRing = document.querySelector(".countdown-ring");
const countdownCircle = document.getElementById("countdownCircle");
const DEFAULT_PARAGRAPH_MESSAGE =
    (paragraphText && paragraphText.textContent) ||
    "Once you hit record, text will show up on this screen. Read the text carefully and hit stop once done.";
const PARAGRAPH_ERROR_MESSAGE =
    "Unable to load the paragraph right now. Please try again.";

const STOP_ICON_SRC = "stop_red_button_icon_227856.svg";
const DEFAULT_MIC_SRC = micImage.getAttribute("src");
const API_BASE_URL = "https://accent-scoring.onrender.com";
const UPLOAD_ENDPOINT = `${API_BASE_URL}/upload`;

let mediaStream = null;
let audioContext = null;
let sourceNode = null;
let processorNode = null;
let recordedBuffers = [];
let recordingLength = 0;
let recordingSampleRate = 44100;
let isRecording = false;
let isSettingUpRecording = false;
let isUploading = false;
let currentParagraphId = null;
let pendingParagraphPromise = null;
let lastRecordingBlob = null;
let lastRecordingFilename = null;
let countdownAnimationId = null;
let countdownEndTimestamp = null;
let countdownCircumference = 0;
const COUNTDOWN_DURATION_SECONDS = 60;

setInstructionText("Press record to begin.");
showParagraphView();
initializeCountdownCircle();

mic.addEventListener("click", () => {
    if (isUploading) {
        console.warn("Upload in progress. Please wait.");
        return;
    }

    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

downloadButton.addEventListener("click", () => {
    if (downloadButton.disabled || !lastRecordingBlob || !lastRecordingFilename) {
        return;
    }

    downloadRecording(lastRecordingBlob, lastRecordingFilename);
});

async function startRecording() {
    if (isSettingUpRecording) {
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Audio recording is not supported in this browser.");
        return;
    }

    isSettingUpRecording = true;
    recordedBuffers = [];
    recordingLength = 0;
    lastRecordingBlob = null;
    lastRecordingFilename = null;
    setDownloadReady(false);
    setInstructionText("Preparing to record...");
    showParagraphView();

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        await audioContext.resume();
        recordingSampleRate = audioContext.sampleRate;

        sourceNode = audioContext.createMediaStreamSource(mediaStream);
        if (typeof audioContext.createScriptProcessor !== "function") {
            throw new Error("Recording is not supported in this browser.");
        }
        processorNode = audioContext.createScriptProcessor(4096, 1, 1);

        processorNode.onaudioprocess = (event) => {
            if (!isRecording) {
                return;
            }

            const channelData = event.inputBuffer.getChannelData(0);
            const bufferCopy = new Float32Array(channelData.length);
            bufferCopy.set(channelData);
            recordedBuffers.push(bufferCopy);
            recordingLength += bufferCopy.length;
        };

        sourceNode.connect(processorNode);
        processorNode.connect(audioContext.destination);

        pendingParagraphPromise = fetchParagraph();
        await pendingParagraphPromise;
        pendingParagraphPromise = null;

        if (!currentParagraphId) {
            throw new Error("Reading passage could not be loaded.");
        }

        isRecording = true;
        setMicVisualState(true);
        startCountdown();
        setInstructionText("Recording in progress...");
    } catch (error) {
        console.error("Unable to start the recording.", error);
        cleanupRecordingNodes();
        showParagraphView();
        setInstructionText("Press record to begin.");
        alert(getRecordingSetupErrorMessage(error));
    } finally {
        isSettingUpRecording = false;
    }
}

async function stopRecording() {
    if (!isRecording) {
        return;
    }

    isRecording = false;
    setMicVisualState(false);
    stopCountdown();
    setInstructionText("Processing recording...");

    if (!currentParagraphId) {
        alert("We couldn't load the reading passage. Please try recording again.");
        showResultsView();
        resetResultsView();
        setResultsStatus("Recording canceled because the reading passage was unavailable.");
        setInstructionText("Press record to try again.");
        cleanupRecordingNodes();
        return;
    }

    const wavBlob = buildWavBlob();
    recordedBuffers = [];
    recordingLength = 0;

    cleanupRecordingNodes();

    if (wavBlob) {
        const filename = buildRecordingFilename();
        lastRecordingBlob = wavBlob;
        lastRecordingFilename = filename;
        setDownloadReady(false);
        showResultsView();
        resetResultsView();
        setResultsStatus("Uploading your recording for scoring...");
        try {
            const result = await uploadRecording(wavBlob, filename);
            showResults(result);
            setDownloadReady(true);
            setInstructionText("Press record to try again.");
        } catch (error) {
            console.error("Upload failed.", error);
            setResultsStatus("We couldn't upload your recording. Please check your connection and try again.");
            setDownloadReady(true);
            setInstructionText("Press record to try again.");
        }
    } else {
        console.warn("No audio data was captured.");
        showResultsView();
        resetResultsView();
        setResultsStatus("No audio data was captured. Please try recording again.");
        lastRecordingBlob = null;
        lastRecordingFilename = null;
        setDownloadReady(false);
        setInstructionText("Press record to try again.");
    }
}

function buildWavBlob() {
    if (!recordedBuffers.length || recordingLength === 0) {
        return null;
    }

    const mergedBuffer = mergeBuffers(recordedBuffers, recordingLength);
    return encodeWav(mergedBuffer, recordingSampleRate);
}

function mergeBuffers(buffers, totalLength) {
    const result = new Float32Array(totalLength);
    let offset = 0;

    buffers.forEach((buffer) => {
        result.set(buffer, offset);
        offset += buffer.length;
    });

    return result;
}

function encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return new Blob([view], { type: "audio/wav" });
}

function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function downloadRecording(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.style.display = "none";
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();

    requestAnimationFrame(() => {
        URL.revokeObjectURL(url);
        anchor.remove();
    });
}

async function uploadRecording(blob, filename) {
    isUploading = true;
    mic.classList.add("uploading");

    try {
        const formData = new FormData();
        formData.append("file", blob, filename);
        formData.append("timestamp", new Date().toISOString());
        if (currentParagraphId) {
            formData.append("paragraph_id", currentParagraphId);
        }

        const response = await fetch(UPLOAD_ENDPOINT, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || "Upload request failed.");
        }

        return await parseUploadResponse(response);
    } finally {
        isUploading = false;
        mic.classList.remove("uploading");
    }
}

function buildRecordingFilename() {
    return `accent-test-${new Date().toISOString().replace(/[:.]/g, "-")}.wav`;
}

function setMicVisualState(recording) {
    mic.classList.toggle("recording", recording);
    micImage.src = recording ? STOP_ICON_SRC : DEFAULT_MIC_SRC;
    micImage.alt = recording ? "Stop recording" : "Microphone Button";
}

async function fetchParagraph() {
    try {
        const response = await fetch(`${API_BASE_URL}/paragraph`);
        if (!response.ok) {
            throw new Error("Unable to load reading text.");
        }

        const data = await response.json();
        const paragraphId = (data && (data.id ?? data["id"])) || null;
        const paragraphTextContent = data && (data.text ?? data["text"]);
        currentParagraphId = paragraphId;
        if (paragraphText && paragraphTextContent) {
            paragraphText.textContent = paragraphTextContent;
        }
    } catch (error) {
        console.error("Paragraph fetch failed.", error);
        currentParagraphId = null;
        if (paragraphText) {
            paragraphText.textContent = PARAGRAPH_ERROR_MESSAGE;
        }
    }
}

async function parseUploadResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return await response.json();
    }

    return await response.text();
}

function showResults(result) {
    const parsed = parseResultsPayload(result);
    showResultsView();
    resetResultsView();
    setResultsStatus("Results ready.");
    setResultsView(parsed.overall, parsed.heavy, parsed.light);
}

function parseResultsPayload(result) {
    const defaults = {
        overall: "--",
        heavy: "None",
        light: "None",
    };

    if (result === undefined || result === null || result === "") {
        return defaults;
    }

    if (typeof result === "string") {
        return parseResultString(result, defaults);
    }

    if (typeof result === "object") {
        return {
            overall:
                formatResultValue(
                    extractValue(result, ["overallScore", "overall", "score"])
                ) || defaults.overall,
            heavy: formatMispronunciationList(
                extractValue(result, [
                    "heavyMispronunciation",
                    "heavyMispronunciations",
                    "mispronounced_words",
                    "heavy",
                ])
            ),
            light: formatMispronunciationList(
                extractValue(result, [
                    "lightMispronunciation",
                    "lightMispronunciations",
                    "slight_mispronunciation",
                    "slight_mispronunciations",
                    "light",
                ])
            ),
        };
    }

    return defaults;
}

function parseResultString(text, defaults) {
    const parsed = { ...defaults };
    const lines = String(text).split(/\r?\n/);

    lines.forEach((line) => {
        const normalized = line.trim();
        if (!normalized) {
            return;
        }

        const [rawLabel, ...rawValue] = normalized.split(":");
        if (!rawValue.length) {
            return;
        }

        const label = rawLabel.trim().toLowerCase();
        const value = rawValue.join(":").trim();

        if (label.includes("overall")) {
            parsed.overall = value || parsed.overall;
        } else if (label.includes("heavy")) {
            parsed.heavy = formatMispronunciationList(value);
        } else if (label.includes("light")) {
            parsed.light = formatMispronunciationList(value);
        }
    });

    return parsed;
}

function extractValue(source, keys) {
    if (!source) {
        return undefined;
    }

    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(source, key) && source[key] != null) {
            return source[key];
        }
    }

    return undefined;
}

function formatMispronunciationList(value) {
    if (value === undefined || value === null || value === "") {
        return "None";
    }

    if (Array.isArray(value)) {
        if (!value.length) {
            return "None";
        }
        return value.map(formatPhonemeEntry).join(" | ");
    }

    if (typeof value === "object") {
        return formatPhonemeEntry(value);
    }

    if (typeof value === "string") {
        const cleaned = value.replace(/[\[\]]/g, "").trim();
        if (!cleaned) {
            return "None";
        }

        const matches = Array.from(
            cleaned.matchAll(/\{?\s*["']?([^"':\s}]+)["']?\s*:\s*([0-9.]+)\s*\}?/g)
        );

        if (matches.length) {
            return matches
                .map(([, phoneme, score]) => `${phoneme}: ${formatScoreWithDenominator(score)}`)
                .join(" | ");
        }

        return cleaned;
    }

    return formatResultValue(value) || "None";
}

function formatPhonemeEntry(entry) {
    if (!entry || typeof entry !== "object") {
        return formatResultValue(entry);
    }

    const [phoneme, score] = Object.entries(entry)[0] || [];
    if (!phoneme) {
        return formatResultValue(entry);
    }

    return `${phoneme}: ${formatScoreWithDenominator(score)}`;
}

function formatScoreWithDenominator(value) {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
        const rounded = Number.isFinite(numeric) ? Math.round(numeric) : numeric;
        return `${rounded}/100`;
    }
    return typeof value === "string" ? value : formatResultValue(value);
}

function formatResultValue(value) {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "string" || typeof value === "number") {
        return String(value);
    }

    if (Array.isArray(value)) {
        return value.map(formatResultValue).join(", ");
    }

    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch (_error) {
            return String(value);
        }
    }

    return String(value);
}

function resetResultsView() {
    if (overallScoreElement) {
        overallScoreElement.textContent = "--";
    }
    if (heavyMispronunciationElement) {
        heavyMispronunciationElement.textContent = "None";
    }
    if (lightMispronunciationElement) {
        lightMispronunciationElement.textContent = "None";
    }
}

function setResultsStatus(statusText) {
    if (resultsStatusElement) {
        resultsStatusElement.textContent = statusText || "";
    }
}

function setResultsView(overall, heavy, light) {
    if (overallScoreElement) {
        overallScoreElement.textContent = overall || "--";
    }

    if (heavyMispronunciationElement) {
        heavyMispronunciationElement.textContent = heavy || "--";
    }

    if (lightMispronunciationElement) {
        lightMispronunciationElement.textContent = light || "--";
    }
}

function setDownloadReady(ready) {
    if (!downloadButton) {
        return;
    }

    const enable = ready && !!lastRecordingBlob && !!lastRecordingFilename;
    downloadButton.disabled = !enable;
}

function initializeCountdownCircle() {
    if (!countdownCircle) {
        return;
    }

    const radius = countdownCircle.r?.baseVal?.value || 0;
    if (!radius) {
        return;
    }

    countdownCircumference = 2 * Math.PI * radius;
    countdownCircle.style.strokeDasharray = countdownCircumference;
    countdownCircle.style.strokeDashoffset = 0;
}

function startCountdown() {
    if (!countdownCircle) {
        return;
    }

    if (!countdownCircumference) {
        initializeCountdownCircle();
    }

    stopCountdown();
    countdownCircle.classList.add("active");
    if (countdownRing) {
        countdownRing.classList.add("active");
    }
    countdownEndTimestamp = performance.now() + COUNTDOWN_DURATION_SECONDS * 1000;
    countdownCircle.style.strokeDashoffset = 0;
    countdownAnimationId = requestAnimationFrame(updateCountdown);
}

function updateCountdown(now) {
    if (!countdownCircle || countdownEndTimestamp === null || !countdownCircumference) {
        return;
    }

    const totalMs = COUNTDOWN_DURATION_SECONDS * 1000;
    const remaining = Math.max(0, countdownEndTimestamp - now);
    const progress = Math.min(1, 1 - remaining / totalMs);
    countdownCircle.style.strokeDashoffset = countdownCircumference * progress;

    if (remaining <= 0) {
        stopCountdown(false);
        if (isRecording) {
            stopRecording();
        }
        return;
    }

    countdownAnimationId = requestAnimationFrame(updateCountdown);
}

function stopCountdown(resetStroke = true) {
    if (countdownAnimationId !== null) {
        cancelAnimationFrame(countdownAnimationId);
        countdownAnimationId = null;
    }

    countdownEndTimestamp = null;
    if (countdownCircle && resetStroke) {
        countdownCircle.style.strokeDashoffset = 0;
        countdownCircle.classList.remove("active");
    }

    if (countdownRing && resetStroke) {
        countdownRing.classList.remove("active");
    }
}

function setInstructionText(message) {
    if (instructionTextElement) {
        instructionTextElement.textContent = message;
    }
}

function showParagraphView() {
    if (paragraphBox) {
        paragraphBox.classList.remove("hidden");
    }
    if (resultsPage) {
        resultsPage.classList.add("hidden");
    }
    resetParagraphMessage();
}

function showResultsView() {
    if (paragraphBox) {
        paragraphBox.classList.add("hidden");
    }
    if (resultsPage) {
        resultsPage.classList.remove("hidden");
    }
}

function resetParagraphMessage() {
    if (paragraphText) {
        paragraphText.textContent = DEFAULT_PARAGRAPH_MESSAGE;
    }
}

function cleanupRecordingNodes() {
    if (processorNode) {
        processorNode.disconnect();
        processorNode.onaudioprocess = null;
        processorNode = null;
    }

    if (sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
}

function getRecordingSetupErrorMessage(error) {
    if (!error) {
        return "We couldn't start a recording. Please refresh the page and try again.";
    }

    const errorName = error.name || "";
    if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        return "Microphone access is required to record audio. Please allow access and try again.";
    }

    if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
        return "We couldn't find a microphone. Please connect one and try again.";
    }

    if (errorName === "NotReadableError" || errorName === "TrackStartError") {
        return "Another application is using the microphone. Close it and try recording again.";
    }

    const message = error.message || "";
    if (message.includes("Reading passage could not be loaded")) {
        return "We couldn't load the reading passage. Please refresh the page and try again.";
    }

    return "We couldn't start the recording. Please check your connection and try again.";
}
   
