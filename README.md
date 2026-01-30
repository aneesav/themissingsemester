# Bioinformatics: The Missing Semester

![Logo](images/missingsemesterlogo.PNG)

# Scope

Module 1: Data types
- Lesson 1: scRNA transcriptomics
- Lesson 2: Spatial transcriptomics
- Lesson 3: Proteomics

Module 2: Multi-omics
- Multimodal data integration

Module 3: Reproducibility & Scale
- Lesson 1: Docker containerization
- Lesson 2: Parallel computing
- Lesson 3: Nextflow workflows

Module 4: AI
- Foundation models in multi-omics


# Contributing and Setup

## Installation

### Option 1: Using pyproject.toml (recommended)

The easiest way to get started is to install the package with all its dependencies in development mode:

```bash
git clone https://github.com/aneesav/themissingsemester.git
cd themissingsemester
pip install -e .
```

This will install all dependencies specified in `pyproject.toml` automatically.

### Option 2: Using requirements.txt

If you prefer a more traditional approach:

```bash
git clone https://github.com/aneesav/themissingsemester.git
cd themissingsemester
pip install -r requirements.txt
```

This will install all dependecies specified in `requirements.txt` at the root level.

### Option 3: With Jupyter Support

To include Jupyter and interactive notebook tools:

```bash
pip install -e ".[jupyter]"
```

Or with `requirements.txt`:

```bash
pip install -r requirements.txt[jupyter]
```

### Option 4: Development Setup

If you'd like to contribute, install development dependencies:

```bash
pip install -e ".[dev,jupyter]"
```

## Python Version Requirements

This project requires **Python 3.10 or higher**. I recommend using Python 3.10 or 3.11 for best compatibility.

### Checking Your Python Version

```bash
python --version
```

### Creating a Virtual Environment

```bash
# Using venv
python -m venv themissingsemester_env
source themissingsemester_env/bin/activate  # On Windows: themissingsemester_env\Scripts\activate

# Or using conda
conda create -n themissingsemester python=3.11
conda activate themissingsemester
```

## Dependencies Overview

The package includes dependencies for:

- **Bioinformatics Analysis**: scanpy, anndata, muon, omnipath
- **Data Processing**: pandas, numpy, scipy, scikit-learn
- **Visualization**: matplotlib, plotly, datashader
- **Spatial Analysis**: spatialdata, geopandas, pyproj
- **Parallel Computing**: dask, dask-image
- **I/O**: h5py, zarr, ome-zarr
- **Jupyter Support**: jupyter, jupyterlab, ipywidgets

## Running the Notebooks

Once dependencies are installed, you can access the notebooks in each module:

```bash
# Navigate to a module
cd module1

# Start Jupyter
jupyter lab

# Or notebook
jupyter notebook
```
**Alternatively, you can clone the repo and simply run in VSC after installing all dependencies.**

## Module Structure

- **Module 1**: scRNA, spatial transcriptomics, and proteomics data
- **Module 2**: Multi-omics data integration
- **Module 3**: Reproducibility, Docker, and scalability

Each module has its own notebook files (`.ipynb`) with comprehensive tutorials.

## Troubleshooting

### Missing C/Fortran Compiler

Some packages (like `igraph`, `leidenalg`) require a C compiler. 

**macOS**:
```bash
xcode-select --install
```

**Ubuntu/Debian**:
```bash
sudo apt-get install build-essential python3-dev
```

**Windows**:
Install Microsoft C++ Build Tools

### Conda Alternative

If you encounter issues with pip, consider using conda:

```bash
conda install -c conda-forge -c bioconda \
  scanpy anndata muon h5py zarr dask pandas scikit-learn matplotlib jupyter
```

## Questions or Issues?

See the original Substack project @ [The Missing Semester](https://themissingsemester.substack.com) or submit an issue [here](https://github.com/aneesav/themissingsemester/issues).