"""
AutiVision — Demo Pipeline
==========================
Simulates the end-to-end AutiVision screening workflow on a folder of test
images, producing realistic dummy results for UI demonstration purposes.

Pipeline per image
------------------
  1. Load image from data/test/
  2. Classify sex (M / F)  — heuristic on filename, otherwise random
  3. Run AI screening  — calls the real FastAPI /predict endpoint
                         (or falls back to a mock if --mock flag is used)
  4. Simulate AQ-10 questionnaire answers  — randomised with realistic bias
  5. Compute combined score  — 0.6 * ai + 0.4 * questionnaire
  6. Save per-image JSON + aggregate summary CSV to output/

Usage
-----
  # With the real ML backend running on localhost:8000
  python scripts/demo_pipeline.py

  # Mock ML results (no backend needed)
  python scripts/demo_pipeline.py --mock

  # Custom paths / API
  python scripts/demo_pipeline.py --input data/test --output output --api http://localhost:8000

  # Bias toward high-risk results (good for demo impact)
  python scripts/demo_pipeline.py --mock --risk-bias high
"""

import argparse
import csv
import io
import json
import os
import random
import re
import string
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# Force UTF-8 stdout/stderr on Windows to avoid cp1252 encode errors
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Optional pretty-printing ────────────────────────────────────────────────

try:
    from rich.console import Console
    from rich.table import Table
    from rich.progress import track
    from rich import print as rprint
    RICH = True
    console = Console()
except ImportError:
    RICH = False
    console = None  # type: ignore

try:
    import requests
    REQUESTS = True
except ImportError:
    REQUESTS = False

# ── AQ-10 item definitions (mirrors lib/data/aq10.ts) ───────────────────────

AQ10_ITEMS = [
    {"id": "q1",  "scores_on_agree": True},   # notices small sounds
    {"id": "q2",  "scores_on_agree": False},  # whole picture vs details
    {"id": "q3",  "scores_on_agree": False},  # multitasking
    {"id": "q4",  "scores_on_agree": False},  # switching back after interrupt
    {"id": "q5",  "scores_on_agree": False},  # reading between lines
    {"id": "q6",  "scores_on_agree": False},  # knows when listener is bored
    {"id": "q7",  "scores_on_agree": True},   # difficulty inferring intentions in stories
    {"id": "q8",  "scores_on_agree": True},   # collects info about categories
    {"id": "q9",  "scores_on_agree": False},  # reading faces
    {"id": "q10", "scores_on_agree": True},   # difficulty understanding intentions
]

AGREE_OPTIONS   = ("DA", "SA")
DISAGREE_OPTIONS = ("SD", "DD")

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


# ── Scoring logic (mirrors lib/ml/predict.ts and services/fusionScoring.ts) ─

def image_score(prediction: str, confidence: float) -> float:
    """P(autistic) regardless of which class the model picked."""
    return confidence if prediction == "autistic" else 1.0 - confidence


def score_aq10(answers: dict) -> dict:
    """
    Converts AQ-10 answer dict → {raw_score, normalised, threshold_met}.
    answers: {q1: "DA"|"SA"|"SD"|"DD", ...}
    """
    raw = 0
    items_scored = {}
    for item in AQ10_ITEMS:
        qid = item["id"]
        answer = answers.get(qid)
        if answer:
            agreed = answer in AGREE_OPTIONS
            counts = agreed if item["scores_on_agree"] else not agreed
            points = 1 if counts else 0
        else:
            points = 0
        items_scored[qid] = points
        raw += points

    return {
        "raw_score": raw,
        "normalised": round(raw / len(AQ10_ITEMS), 4),
        "threshold_met": raw >= 6,
        "items_scored": items_scored,
    }


def fuse(face_risk: float, normalised_aq: float) -> dict:
    """Combined risk = 0.6 * face + 0.4 * questionnaire."""
    combined = max(0.0, min(1.0, 0.6 * face_risk + 0.4 * normalised_aq))
    return {
        "combined_risk": round(combined, 4),
        "tier": tier_for(combined),
        "weights": {"face": 0.6, "questionnaire": 0.4},
    }


def tier_for(score: float) -> str:
    if score >= 0.65:
        return "ELEVE"
    if score >= 0.35:
        return "MODERE"
    return "FAIBLE"


# ── Gender heuristic ─────────────────────────────────────────────────────────

def infer_sex(filename: str) -> str:
    """
    Try to infer sex from filename patterns before falling back to random.
    Patterns: boy/girl, male/female, _m/_f, m_/f_, -m-/-f-
    """
    stem = Path(filename).stem.lower()

    male_patterns   = [r"\bboy\b", r"\bmale\b", r"\bm\b", r"_m_", r"^m[_\-\d]", r"[_\-]m$"]
    female_patterns = [r"\bgirl\b", r"\bfemale\b", r"\bf\b", r"_f_", r"^f[_\-\d]", r"[_\-]f$"]

    for p in female_patterns:
        if re.search(p, stem):
            return "F"
    for p in male_patterns:
        if re.search(p, stem):
            return "M"

    return random.choice(["M", "F"])


# ── Anonymous code generator (mirrors lib/utils.ts::generateAnonymousCode) ──

def generate_anonymous_code() -> str:
    prefix = "AV"
    letters = "".join(random.choices(string.ascii_uppercase, k=3))
    digits  = "".join(random.choices(string.digits, k=4))
    return f"{prefix}-{letters}-{digits}"


# ── ML API call ──────────────────────────────────────────────────────────────

def call_ml_api(image_path: Path, api_url: str) -> dict:
    """POST image to FastAPI /predict and return the JSON response."""
    if not REQUESTS:
        raise ImportError("pip install requests  to call the real ML API")

    with open(image_path, "rb") as fh:
        mime = _mime_for(image_path)
        response = requests.post(
            f"{api_url}/predict",
            files={"file": (image_path.name, fh, mime)},
            timeout=30,
        )

    if response.status_code == 503:
        raise ConnectionError(f"ML backend unavailable: {response.json().get('detail', '')}")
    response.raise_for_status()
    return response.json()


def _mime_for(path: Path) -> str:
    ext = path.suffix.lower()
    return {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png",  ".webp": "image/webp",
        ".bmp": "image/bmp",
    }.get(ext, "image/jpeg")


# ── Mock ML results ──────────────────────────────────────────────────────────

def mock_ml_result(risk_bias: str = "balanced") -> dict:
    """
    Simulate a /predict response with realistic confidence values.

    risk_bias:
        "high"     — weighted toward autistic predictions (good for demos)
        "low"      — weighted toward non-autistic
        "balanced" — 50/50 roughly
    """
    bias_map = {
        "high":     ("autistic", 0.62, 0.94),
        "low":      ("non_autistic", 0.58, 0.90),
        "balanced": (None, 0.52, 0.95),
    }
    default_class, conf_lo, conf_hi = bias_map.get(risk_bias, bias_map["balanced"])

    if default_class is None:
        prediction = random.choice(["autistic", "non_autistic"])
    else:
        # 70% chance of the biased class
        prediction = default_class if random.random() < 0.70 else (
            "non_autistic" if default_class == "autistic" else "autistic"
        )

    confidence = round(random.uniform(conf_lo, conf_hi), 4)
    return {
        "prediction": prediction,
        "confidence": confidence,
        "confidence_pct": f"{confidence * 100:.1f}%",
        "threshold_used": 0.5,
        "model": "MobileNetV2-mock",
    }


# ── AQ-10 answer simulator ───────────────────────────────────────────────────

def simulate_aq10_answers(ai_score: float, risk_bias: str = "balanced") -> dict:
    """
    Generate plausible AQ-10 answers.

    The answers are biased so that high AI scores tend to produce higher
    questionnaire scores too — making the combined results coherent.
    """
    # p_autistic_answer: probability each "autism-indicator" question is answered
    # in the autism direction.
    if risk_bias == "high":
        base_p = 0.72
    elif risk_bias == "low":
        base_p = 0.28
    else:
        base_p = 0.50

    # Blend: 60% AI-driven, 40% random noise
    p = max(0.05, min(0.95, 0.6 * ai_score + 0.4 * base_p))

    answers = {}
    for item in AQ10_ITEMS:
        if item["scores_on_agree"]:
            # Autism-indicator: agree = scores 1
            if random.random() < p:
                answers[item["id"]] = random.choice(["DA", "SA"])
            else:
                answers[item["id"]] = random.choice(["SD", "DD"])
        else:
            # Reverse: disagree = scores 1
            if random.random() < p:
                answers[item["id"]] = random.choice(["SD", "DD"])
            else:
                answers[item["id"]] = random.choice(["DA", "SA"])

    return answers


# ── Per-image pipeline ───────────────────────────────────────────────────────

def process_image(
    image_path: Path,
    api_url: str,
    mock: bool,
    risk_bias: str,
    patient_index: int,
) -> dict:
    """Run the full pipeline for a single image and return a result dict."""

    filename = image_path.name
    code = generate_anonymous_code()
    sex = infer_sex(filename)
    age = random.randint(3, 12)  # typical ASD screening age range

    # ── 1. AI Screening ─────────────────────────────────────────────────────
    if mock:
        ml = mock_ml_result(risk_bias)
        inference_ms = random.randint(80, 340)  # simulate latency
    else:
        t0 = time.time()
        ml = call_ml_api(image_path, api_url)
        inference_ms = int((time.time() - t0) * 1000)

    ai_score = image_score(ml["prediction"], ml["confidence"])

    # ── 2. AQ-10 Questionnaire ───────────────────────────────────────────────
    raw_answers = simulate_aq10_answers(ai_score, risk_bias)
    aq = score_aq10(raw_answers)

    # ── 3. Combined result ───────────────────────────────────────────────────
    fusion = fuse(ai_score, aq["normalised"])

    # ── 4. Assemble result record ────────────────────────────────────────────
    now = datetime.now(timezone.utc).isoformat()

    return {
        "meta": {
            "source_file": filename,
            "processed_at": now,
            "patient_index": patient_index,
            "inference_ms": inference_ms,
            "mock": mock,
        },
        "patient": {
            "code_anonymise": code,
            "age": age,
            "sexe": sex,
        },
        "ai_screening": {
            "prediction": ml["prediction"],
            "confidence": ml["confidence"],
            "confidence_pct": ml["confidence_pct"],
            "threshold_used": ml["threshold_used"],
            "model": ml["model"],
            "score_image": round(ai_score, 4),
            "tier_ai": tier_for(ai_score),
        },
        "questionnaire": {
            "type": "AQ-10",
            "answers": raw_answers,
            "raw_score": aq["raw_score"],
            "score_normalised": aq["normalised"],
            "threshold_met": aq["threshold_met"],
            "tier_questionnaire": tier_for(aq["normalised"]),
        },
        "combined": {
            "score_global": fusion["combined_risk"],
            "niveau_risque": fusion["tier"],
            "result_mode": "combined",
            "weights": fusion["weights"],
        },
    }


# ── Output helpers ───────────────────────────────────────────────────────────

def save_result(result: dict, output_dir: Path) -> Path:
    """Write per-image JSON to output_dir/<code>.json."""
    code = result["patient"]["code_anonymise"]
    stem = Path(result["meta"]["source_file"]).stem
    out_file = output_dir / f"{stem}__{code}.json"
    out_file.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    return out_file


def save_summary_csv(results: list, output_dir: Path) -> Path:
    """Write a one-row-per-image CSV summary."""
    csv_path = output_dir / "summary.csv"
    fields = [
        "source_file", "patient_code", "age", "sex",
        "ai_prediction", "ai_confidence", "score_image", "tier_ai",
        "aq10_raw_score", "aq10_normalised", "aq10_threshold_met", "tier_questionnaire",
        "combined_score", "niveau_risque", "mock", "inference_ms",
    ]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for r in results:
            writer.writerow({
                "source_file":         r["meta"]["source_file"],
                "patient_code":        r["patient"]["code_anonymise"],
                "age":                 r["patient"]["age"],
                "sex":                 r["patient"]["sexe"],
                "ai_prediction":       r["ai_screening"]["prediction"],
                "ai_confidence":       r["ai_screening"]["confidence"],
                "score_image":         r["ai_screening"]["score_image"],
                "tier_ai":             r["ai_screening"]["tier_ai"],
                "aq10_raw_score":      r["questionnaire"]["raw_score"],
                "aq10_normalised":     r["questionnaire"]["score_normalised"],
                "aq10_threshold_met":  r["questionnaire"]["threshold_met"],
                "tier_questionnaire":  r["questionnaire"]["tier_questionnaire"],
                "combined_score":      r["combined"]["score_global"],
                "niveau_risque":       r["combined"]["niveau_risque"],
                "mock":                r["meta"]["mock"],
                "inference_ms":        r["meta"]["inference_ms"],
            })
    return csv_path


# ── Terminal output helpers ───────────────────────────────────────────────────

TIER_COLORS = {"ELEVE": "red", "MODERE": "yellow", "FAIBLE": "green"}

def _tier_badge(tier: str) -> str:
    symbols = {"ELEVE": "● HIGH", "MODERE": "◐ MOD ", "FAIBLE": "○ LOW "}
    return symbols.get(tier, tier)


def print_result_row(result: dict, idx: int, total: int) -> None:
    ai   = result["ai_screening"]
    aq   = result["questionnaire"]
    comb = result["combined"]
    pat  = result["patient"]
    meta = result["meta"]

    if RICH:
        tier_color = TIER_COLORS.get(comb["niveau_risque"], "white")
        console.print(
            f"  [{idx:>2}/{total}] [bold]{meta['source_file']:<28}[/bold]"
            f"  sex=[cyan]{pat['sexe']}[/cyan]  age=[cyan]{pat['age']}[/cyan]"
            f"  AI=[yellow]{ai['score_image']:.2f}[/yellow] ({ai['prediction'][:3].upper()})"
            f"  AQ=[yellow]{aq['raw_score']}/10[/yellow]"
            f"  combined=[{tier_color}]{comb['score_global']:.2f}[/{tier_color}]"
            f"  [bold {tier_color}]{_tier_badge(comb['niveau_risque'])}[/bold {tier_color}]"
            f"  [{meta['inference_ms']}ms]"
        )
    else:
        print(
            f"  [{idx:>2}/{total}] {meta['source_file']:<28}"
            f"  sex={pat['sexe']}  age={pat['age']}"
            f"  AI={ai['score_image']:.2f}({ai['prediction'][:3].upper()})"
            f"  AQ={aq['raw_score']}/10"
            f"  combined={comb['score_global']:.2f}"
            f"  {_tier_badge(comb['niveau_risque'])}"
            f"  [{meta['inference_ms']}ms]"
        )


def print_summary(results: list, csv_path: Path, output_dir: Path) -> None:
    total   = len(results)
    high    = sum(1 for r in results if r["combined"]["niveau_risque"] == "ELEVE")
    mod     = sum(1 for r in results if r["combined"]["niveau_risque"] == "MODERE")
    low     = sum(1 for r in results if r["combined"]["niveau_risque"] == "FAIBLE")
    avg_ai  = sum(r["ai_screening"]["score_image"] for r in results) / total if total else 0
    avg_comb= sum(r["combined"]["score_global"] for r in results) / total if total else 0

    if RICH:
        t = Table(title="Demo Pipeline — Summary", show_header=True, header_style="bold magenta")
        t.add_column("Metric",  style="dim",  width=28)
        t.add_column("Value",   justify="right")
        t.add_row("Images processed",       str(total))
        t.add_row("High-risk  (ELEVE)",     f"[red]{high}[/red]   ({high/total*100:.0f}%)" if total else "—")
        t.add_row("Moderate   (MODERE)",    f"[yellow]{mod}[/yellow]   ({mod/total*100:.0f}%)" if total else "—")
        t.add_row("Low-risk   (FAIBLE)",    f"[green]{low}[/green]   ({low/total*100:.0f}%)" if total else "—")
        t.add_row("Avg AI score",           f"{avg_ai:.3f}")
        t.add_row("Avg combined score",     f"{avg_comb:.3f}")
        t.add_row("Output folder",          str(output_dir))
        t.add_row("Summary CSV",            str(csv_path))
        console.print()
        console.print(t)
    else:
        print("\n── Demo Pipeline — Summary ──────────────────")
        print(f"  Images processed   : {total}")
        if total:
            print(f"  High-risk  (ELEVE) : {high}  ({high/total*100:.0f}%)")
            print(f"  Moderate  (MODERE) : {mod}  ({mod/total*100:.0f}%)")
            print(f"  Low-risk  (FAIBLE) : {low}  ({low/total*100:.0f}%)")
        print(f"  Avg AI score       : {avg_ai:.3f}")
        print(f"  Avg combined score : {avg_comb:.3f}")
        print(f"  Output folder      : {output_dir}")
        print(f"  Summary CSV        : {csv_path}")
        print("─────────────────────────────────────────────")


# ── CLI entry point ──────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="AutiVision demo pipeline — generate dummy screening results for UI testing.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--input",  "-i",
        default="data/test",
        help="Folder containing test images (default: data/test)",
    )
    parser.add_argument(
        "--output", "-o",
        default="output",
        help="Folder to write results to (default: output)",
    )
    parser.add_argument(
        "--api",
        default="http://localhost:8000",
        help="FastAPI ML backend URL (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Skip real ML call — use randomised AI results instead",
    )
    parser.add_argument(
        "--risk-bias",
        choices=["high", "low", "balanced"],
        default="balanced",
        help="Bias simulated results toward a risk tier (default: balanced)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducible results",
    )
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    input_dir  = Path(args.input)
    output_dir = Path(args.output)

    # ── Validate input folder ────────────────────────────────────────────────
    if not input_dir.exists():
        # Create it with a README so the user knows what to put here
        input_dir.mkdir(parents=True, exist_ok=True)
        (input_dir / "README.txt").write_text(
            "Place test images here (jpg / png / webp / bmp).\n"
            "Filename can contain sex hints: boy/girl, male/female, _m_, _f_\n",
            encoding="utf-8",
        )
        print(f"  [!] Input folder created at {input_dir}/ - no images yet.")
        print("      Add some images and re-run the script.")
        return 1

    images = sorted(
        p for p in input_dir.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    )

    if not images:
        print(f"  [!] No images found in {input_dir}/")
        print(f"      Supported formats: {', '.join(sorted(IMAGE_EXTENSIONS))}")
        return 1

    output_dir.mkdir(parents=True, exist_ok=True)

    # ── Header ───────────────────────────────────────────────────────────────
    if RICH:
        console.rule("[bold blue]AutiVision Demo Pipeline[/bold blue]")
        mode_label = "[yellow]MOCK[/yellow]" if args.mock else f"[green]REAL → {args.api}[/green]"
        console.print(f"  Mode : {mode_label}    Bias : [cyan]{args.risk_bias}[/cyan]    Images : [cyan]{len(images)}[/cyan]")
        console.print()
    else:
        print("── AutiVision Demo Pipeline ─────────────────")
        mode_label = "MOCK" if args.mock else f"REAL → {args.api}"
        print(f"  Mode   : {mode_label}")
        print(f"  Bias   : {args.risk_bias}")
        print(f"  Images : {len(images)}")
        print()

    # ── Check ML API health (real mode only) ─────────────────────────────────
    if not args.mock:
        if not REQUESTS:
            print("  ✗  'requests' library not found.  pip install requests")
            print("     Use --mock to skip the real ML call.")
            return 1
        try:
            health = requests.get(f"{args.api}/health", timeout=5).json()
            if not health.get("model_loaded"):
                print(f"  ✗  ML backend reports model NOT loaded: {health.get('load_error')}")
                print("     Use --mock to skip the real ML call.")
                return 1
            if RICH:
                console.print(f"  [green]OK[/green] ML backend healthy - model: {health.get('model_path', '?')}")
            else:
                print(f"  OK ML backend healthy - model: {health.get('model_path', '?')}")
        except Exception as exc:
            print(f"  ✗  Cannot reach ML backend at {args.api}: {exc}")
            print("     Start the FastAPI server or use --mock.")
            return 1

    # ── Process images ────────────────────────────────────────────────────────
    results = []
    total = len(images)

    for idx, img_path in enumerate(images, start=1):
        try:
            result = process_image(
                image_path=img_path,
                api_url=args.api,
                mock=args.mock,
                risk_bias=args.risk_bias,
                patient_index=idx,
            )
            json_path = save_result(result, output_dir)
            results.append(result)
            print_result_row(result, idx, total)
        except Exception as exc:
            msg = f"  ERR [{idx}/{total}] {img_path.name}: {exc}"
            if RICH:
                console.print(f"[red]{msg}[/red]")
            else:
                print(msg)

    if not results:
        print("\n  No results generated — all images failed.")
        return 1

    # ── Save summary CSV ──────────────────────────────────────────────────────
    csv_path = save_summary_csv(results, output_dir)
    print_summary(results, csv_path, output_dir)

    return 0


if __name__ == "__main__":
    sys.exit(main())
