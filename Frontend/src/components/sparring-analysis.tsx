import { useEffect, useRef, useState } from "react";
import { Upload, ScanLine, Square, FileVideo, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useAccount } from "./kinetic-account";
import { supabase } from "@/integrations/supabase/client";
import { extractFrames } from "@/lib/video-frames";
import { disciplines } from "@/lib/kinetic-data";
import type { Database } from "@/integrations/supabase/types";
type Report = Database["public"]["Tables"]["sparring_reports"]["Row"];
export function SparringAnalysis() {
  const { user, signIn } = useAccount();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [discipline, setDiscipline] = useState("MMA");
  const [focus, setFocus] = useState("Guard recovery and footwork");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const abort = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function refresh() {
    if (!user) return;
    const { data, error } = await supabase
      .from("sparring_reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setReports(data ?? []);
  }
  useEffect(() => {
    if (user) void refresh();
    else setReports([]);
  }, [user]);
  function choose(f: File | undefined) {
    if (!f) return;
    if (
      !["video/mp4", "video/webm", "video/quicktime"].includes(f.type) ||
      f.size > 20 * 1024 * 1024 ||
      f.size === 0
    ) {
      setError("Choose an MP4, WebM or MOV video up to 20 MB.");
      return;
    }
    setFile(f);
    setText("");
    setError("");
  }
  async function analyze() {
    if (!user) {
      signIn();
      return;
    }
    if (!file) return;
    setBusy(true);
    setError("");
    setText("");
    const controller = new AbortController();
    abort.current = controller;
    let id: string | undefined;
    try {
      setStage("SAMPLING 12 VIDEO FRAMES…");
      const extracted = await extractFrames(file);
      if (controller.signal.aborted) throw new DOMException("Stopped", "AbortError");
      setStage("UPLOADING PRIVATE VIDEO…");
      const path = `${user.id}/${crypto.randomUUID()}.${file.type === "video/webm" ? "webm" : file.type === "video/quicktime" ? "mov" : "mp4"}`;
      const uploaded = await supabase.storage
        .from("sparring-videos")
        .upload(path, file, { contentType: file.type });
      if (uploaded.error) throw uploaded.error;
      const created = await supabase
        .from("sparring_reports")
        .insert({
          user_id: user.id,
          filename: file.name,
          video_path: path,
          discipline,
          focus,
          duration_seconds: extracted.duration,
        })
        .select()
        .single();
      if (created.error) throw created.error;
      id = created.data.id;
      if (controller.signal.aborted) throw new DOMException("Stopped", "AbortError");
      setStage("AI TECHNIQUE ANALYSIS…");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in again to analyze your video.");
      const response = await fetch("/api/public/analyze-sparring", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, frames: extracted.frames }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(body.error ?? body.message ?? `Analysis failed (${response.status})`);
      }
      if (!response.body) throw new Error("No analysis stream received.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let output = "";
      let terminalError = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const line = chunk
            .split("\n")
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trim())
            .join("");
          if (!line || line === "[DONE]") continue;
          const e = JSON.parse(line);
          if (e.type === "response.output_text.delta") {
            output += e.delta;
            setText(output);
          }
          if (e.type === "response.refusal.delta")
            terminalError = "The model declined this request.";
          if (e.type === "error" || e.type === "response.failed")
            terminalError = e.message ?? e.response?.error?.message ?? "Analysis failed.";
          if (e.type === "kinetic.saved") setStage("REPORT SAVED");
          if (e.type === "kinetic.error") terminalError = e.message;
        }
      }
      if (terminalError) throw new Error(terminalError);
      if (!output.trim()) throw new Error("The model returned no technique feedback.");
      setStage("ANALYSIS COMPLETE");
      await refresh();
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setStage("ANALYSIS STOPPED");
        if (id) await supabase.from("sparring_reports").update({ status: "stopped" }).eq("id", id);
      } else {
        setError(e instanceof Error ? e.message : "Analysis failed.");
        setStage("");
      }
    } finally {
      if (mounted.current) setBusy(false);
      abort.current = null;
    }
  }
  return (
    <section className="sparring-section">
      <div className="section-heading">
        <div>
          <span className="section-index">03 // AI TECHNIQUE LAB</span>
          <h2>SPARRING VIDEO ANALYSIS</h2>
        </div>
        <span className="state-badge">
          <ScanLine size={12} /> AI GATEWAY
        </span>
      </div>
      <div className="sparring-layout">
        <div
          className="upload-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy) choose(e.dataTransfer.files[0]);
          }}
        >
          {preview ? <video src={preview} controls playsInline /> : <FileVideo size={44} />}
          <input
            ref={input}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            hidden
            onChange={(e) => choose(e.target.files?.[0])}
          />
          <Button variant="outline" onClick={() => input.current?.click()} disabled={busy}>
            <Upload />
            {file ? "Change video" : "Upload sparring video"}
          </Button>
          <span>{file?.name ?? "MP4 / WEBM / MOV · UP TO 20 MB"}</span>
          <p className="micro-label">
            12 sampled frames, not continuous motion tracking. No force measurement.
          </p>
        </div>
        <div className="analysis-controls">
          <label>
            Discipline
            <Select value={discipline} onValueChange={setDiscipline} disabled={busy}>
              <SelectTrigger aria-label="Analysis discipline">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {disciplines.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label>
            Training focus
            <Input
              value={focus}
              maxLength={300}
              disabled={busy}
              onChange={(e) => setFocus(e.target.value)}
            />
          </label>
          <p className="micro-label">
            Only upload footage you have permission to share. Sampled images are sent to AI Gateway
            for coaching feedback.
          </p>
          {busy ? (
            <Button variant="destructive" onClick={() => abort.current?.abort()}>
              <Square />
              Stop analysis
            </Button>
          ) : (
            <Button disabled={!file} onClick={analyze}>
              <ScanLine />
              {user ? "Analyze technique" : "Sign in & analyze"}
            </Button>
          )}
          {stage && (
            <span role="status" className="section-index">
              {stage}
            </span>
          )}
          {error && (
            <p role="alert" className="warning-text">
              {error}
            </p>
          )}
        </div>
      </div>
      {text && (
        <div className="ai-report">
          <span className="section-index">PERSONALIZED TECHNIQUE REVIEW</span>
          <div className="ai-report-text">{text}</div>
          <p className="micro-label">
            Visual coaching guidance, not medical advice. Review with a qualified coach.
          </p>
        </div>
      )}
      {reports.length > 0 && (
        <div className="saved-reports">
          <h3>SAVED VIDEO REPORTS</h3>
          {reports.map((r) => (
            <div className="saved-report" key={r.id}>
              <FileVideo />
              <div>
                <strong>{r.filename}</strong>
                <span>
                  {r.discipline} · {r.status} · {r.created_at.slice(0, 10)}
                </span>
              </div>
              <Button
                variant="ghost"
                disabled={!r.report}
                onClick={() => {
                  setText(r.report);
                  setError("");
                }}
              >
                View report
                <ArrowUpRight />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
