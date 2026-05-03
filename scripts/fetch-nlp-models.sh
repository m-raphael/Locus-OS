#!/usr/bin/env bash
# Locus-OS · download + ONNX-export the Phase A NLP models.
#
# What this does:
#   1. Creates a throwaway Python venv under ./.venv-nlp
#   2. Installs HuggingFace Optimum + ONNX Runtime
#   3. Downloads the POS and NER models from the HuggingFace Hub
#   4. Exports both to ONNX (FP32 first, then INT8-quantises)
#   5. Copies the four artefacts into $LOCUS_MODEL_DIR
#   6. Computes SHA-256 of each and writes a manifest.json
#
# Output files (written to LOCUS_MODEL_DIR):
#   pos.onnx               POS tagger weights
#   pos_tokenizer.json     POS tokenizer
#   ner.onnx               NER tagger weights
#   ner_tokenizer.json     NER tokenizer
#   manifest.json          { name, sha256, source_model } per artefact
#
# Models (English-only, Apache-2.0 / CC-BY-4.0 compatible):
#   POS: vblagoje/bert-english-uncased-finetuned-pos  (UPOS, 17 labels)
#   NER: tner/roberta-large-ontonotes5                (OntoNotes-5, 18 labels)
#
# If you swap either source, update the BIO_LABELS / UPOS_LABELS arrays in
# crates/locus-nlp/src/{ner,pos}.rs to match the new model's id2label order.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_MODEL_DIR="${HOME}/Library/Caches/locus/models"
MODEL_DIR="${LOCUS_MODEL_DIR:-$DEFAULT_MODEL_DIR}"

POS_MODEL="vblagoje/bert-english-uncased-finetuned-pos"
NER_MODEL="tner/roberta-large-ontonotes5"

VENV="${REPO_ROOT}/.venv-nlp"
WORK="${REPO_ROOT}/.nlp-export-tmp"

echo "[fetch-nlp] target dir: ${MODEL_DIR}"
mkdir -p "${MODEL_DIR}"
mkdir -p "${WORK}"

if [[ ! -d "${VENV}" ]]; then
  echo "[fetch-nlp] creating Python venv at ${VENV}"
  python3 -m venv "${VENV}"
fi

# shellcheck disable=SC1091
source "${VENV}/bin/activate"

echo "[fetch-nlp] installing optimum + onnxruntime (one-time)"
pip install --quiet --upgrade pip
pip install --quiet \
  "optimum[onnxruntime]>=1.21" \
  "transformers>=4.40" \
  "torch>=2.2"

export_one() {
  local hf_id="$1"
  local task="$2"        # token-classification
  local out_subdir="$3"  # pos | ner
  local final_model="$4" # pos.onnx | ner.onnx
  local final_tok="$5"   # pos_tokenizer.json | ner_tokenizer.json

  local stage="${WORK}/${out_subdir}"
  echo "[fetch-nlp] exporting ${hf_id} → ONNX (${stage})"
  rm -rf "${stage}"
  optimum-cli export onnx \
    --model "${hf_id}" \
    --task "${task}" \
    "${stage}" >/dev/null

  echo "[fetch-nlp] INT8-quantising ${out_subdir}"
  python - <<PY
from pathlib import Path
from optimum.onnxruntime import ORTQuantizer
from optimum.onnxruntime.configuration import AutoQuantizationConfig

stage = Path("${stage}")
quantized = stage / "quantized"
quantized.mkdir(exist_ok=True)
qconfig = AutoQuantizationConfig.avx2(is_static=False, per_channel=False)
quantizer = ORTQuantizer.from_pretrained(stage)
quantizer.quantize(save_dir=quantized, quantization_config=qconfig)
PY

  cp "${stage}/quantized/model_quantized.onnx" "${MODEL_DIR}/${final_model}"
  cp "${stage}/tokenizer.json" "${MODEL_DIR}/${final_tok}"
}

export_one "${POS_MODEL}" token-classification pos pos.onnx pos_tokenizer.json
export_one "${NER_MODEL}" token-classification ner ner.onnx ner_tokenizer.json

echo "[fetch-nlp] writing manifest"
python - <<PY
import hashlib, json
from pathlib import Path

model_dir = Path("${MODEL_DIR}")
entries = []
for name, source in [
    ("pos.onnx",            "${POS_MODEL}"),
    ("pos_tokenizer.json",  "${POS_MODEL}"),
    ("ner.onnx",            "${NER_MODEL}"),
    ("ner_tokenizer.json",  "${NER_MODEL}"),
]:
    p = model_dir / name
    digest = hashlib.sha256(p.read_bytes()).hexdigest()
    entries.append({"name": name, "sha256": digest, "source_model": source,
                    "size_bytes": p.stat().st_size})

manifest = {"version": 1, "artefacts": entries}
(model_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest, indent=2))
PY

deactivate

echo "[fetch-nlp] cleaning intermediate exports"
rm -rf "${WORK}"

echo
echo "[fetch-nlp] done. Files in ${MODEL_DIR}:"
ls -lh "${MODEL_DIR}" | awk 'NR>1 {print "  " $9 "  " $5}'
echo
echo "Run 'cargo test -p locus-nlp' to exercise the golden fixtures."
