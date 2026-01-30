# Module 4: AI in Genomics

This module covers foundation models in multi-omics, including single-cell foundation models (scGPT) and LLM-powered genomics workflows using LangChain and OpenAI.

## Why module4 has its own pyproject.toml

Module 4 requires a **separate virtual environment** from modules 1-3. The two `pyproject.toml` files cannot be installed into the same environment because of conflicting version requirements, primarily driven by NumPy.

### The root cause: NumPy 1.x vs 2.x

The parent project (modules 1-3) uses **NumPy 2.2.6**. Module 4 pins **NumPy 1.26.4** because several of its key dependencies — notably `numba`, `cellxgene-census`, and `tiledbsoma` — do not yet support NumPy 2.x. Since NumPy's major version change introduced breaking C API changes, packages compiled against NumPy 1.x will not work with NumPy 2.x installed.

This NumPy constraint cascades into version differences across the rest of the scientific stack.

### Version conflicts at a glance

| Package | Parent (modules 1-3) | Module 4 | Why module 4 differs |
|---|---|---|---|
| **numpy** | 2.2.6 | 1.26.4 | numba, cellxgene-census, and tiledbsoma require NumPy 1.x |
| **numba** | 0.61.2 | 0.60.0 | Must match NumPy 1.26; numba 0.61 requires NumPy 2.x |
| **llvmlite** | 0.44.0 | 0.43.0 | Paired with numba; each numba release requires a specific llvmlite |
| **pandas** | 2.3.1 | 2.2.3 | Pinned to stay compatible with NumPy 1.26 |
| **h5py** | 3.14.0 | 3.12.1 | Built against NumPy 1.x ABI |
| **scipy** | >=1.11.0 | 1.14.1 | Pinned to a NumPy 1.x-compatible build |
| **matplotlib** | >=3.10.3 | 3.10.0 | Pinned to a NumPy 1.x-compatible build |
| **aiohttp** | 3.12.14 | 3.9.3 | Constrained by cellxgene-census and langchain dependency trees |
| **networkx** | 3.5 | 3.4.2 | Older release for compatibility with the rest of the stack |
| **requests** | 2.32.4 | 2.31.0 | Constrained by openai and langchain |
| **joblib** | 1.5.1 | 1.3.2 | Matched to scikit-learn 1.6.0 |
| **packaging** | 25.0 | 23.2 | Constrained by langchain dependency tree |
| **typing-extensions** | 4.12.2 | 4.9.0 | Constrained by pydantic 2.6.1 / langchain |
| **pillow** | 11.3.0 | 11.0.0 | Pinned to a NumPy 1.x-compatible build |
| **s3fs / fsspec** | 2025.7.0 | 2025.5.1 | Constrained by cellxgene-census / tiledbsoma |

### Packages unique to module 4

Module 4 introduces dependencies that are not present in the parent project at all:

- **AI / LLM**: `openai`, `langchain`, `langchain-community`, `langchain-core`, `langchain-pinecone`, `langsmith`, `tiktoken`, `pinecone-client`
- **Single-cell data access**: `cellxgene-census`, `tiledbsoma`, `loompy`, `session_info`, `numpy-groupies`
- **Dimensionality reduction**: `umap-learn`
- **Data & storage**: `SQLAlchemy`, `PyMySQL`, `datajoint`, `minio`
- **Web frameworks**: `fastapi`, `Flask`, `uvicorn`, `httpx`
- **Serialization**: `pydantic`, `dataclasses-json`, `marshmallow`
- **Utilities**: `deepdiff`, `Faker`, `pydot`, `watchdog`, `cryptography`, `pycryptodome`

## Setting up the module 4 environment

Create a separate virtual environment for this module:

```bash
cd module4
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

Do **not** install the parent `pyproject.toml` into this environment, or vice versa. The NumPy version conflict will cause import errors or segfaults in compiled extensions.

## Data and model files

The following large files are required but **not tracked in git**:

- `data/Immune_ALL_human.h5ad` (~2 GB) — Human immune cell atlas in H5AD format
- `scGPT_heart/best_model.pt` (~205 MB) — Pre-trained scGPT model weights

The smaller model metadata files (`scGPT_heart/args.json`, `scGPT_heart/vocab.json`) are also not tracked. Refer to the notebook for download instructions.
