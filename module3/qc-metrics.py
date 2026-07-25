#!/usr/bin/env python3
import argparse
import scanpy as sc
import anndata as ad

def main(input_file, output_file):
    adata = sc.read_h5ad(input_file)
    adata.var["mt"] = adata.var_names.str.startswith("MT-")

    sc.pp.calculate_qc_metrics(
        adata,
        qc_vars=["mt"],
        percent_top=None,
        log1p=False,
        inplace=True
    )

    adata.write(output_file)
    print(f"QC metrics added. Output saved to: {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Annotate MT genes & compute QC metrics on AnnData")
    parser.add_argument("input", help="Path to input AnnData .h5ad file")
    parser.add_argument("output", help="Path to output AnnData .h5ad file")
    args = parser.parse_args()
    main(args.input, args.output)