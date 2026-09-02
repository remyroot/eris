#!/bin/bash
# Initialize data directories
set -e

DATA_DIR="${DATA_DIR:-./data}"
mkdir -p "$DATA_DIR"
mkdir -p "$DATA_DIR/corpus"
mkdir -p "$DATA_DIR/cache"
mkdir -p "$DATA_DIR/exports"

echo "data directories initialized at $DATA_DIR"
