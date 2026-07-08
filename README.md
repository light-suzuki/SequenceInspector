# Sequence Inspector

[![CI](https://github.com/light-suzuki/SequenceInspector/actions/workflows/ci.yml/badge.svg)](https://github.com/light-suzuki/SequenceInspector/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/light-suzuki/=semver)](https://github.com/light-suzuki/SequenceInspector/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue)](https://light-suzuki.github.io/SequenceInspector/)


A small offline DNA sequence inspector for Windows. It calculates sequence
length, GC content, ORF candidates, and common restriction sites entirely in the
browser. English and Japanese are included in the single HTML file.

Windows向けの小さなオフラインDNA配列確認ツールです。配列長、GC含量、ORF候補、
代表的な制限酵素サイトをブラウザ内だけで計算します。

## Requirements / 必要条件

- Windows 10 or 11
- Python 3 with either the `py` or `python` command
- A modern browser

No WSL, Node.js, BLAST, Primer3, genome download, or internet connection is
required after cloning.

## Install and start / 導入と起動

```powershell
git clone https://github.com/light-suzuki/SequenceInspector.git
cd SequenceInspector
.\start_windows.bat
```

The launcher selects the first free localhost port from 8765 through 8785,
verifies the HTTP response, then opens the browser. The chosen URL is printed in
the terminal and saved only in `.runtime\run.json`.

8765が使用中でも失敗せず、8765〜8785から空きポートを選んでHTTP応答確認後に開きます。

Stop only the server started by this clone:

```powershell
.\stop_windows.ps1
```

## Use / 使い方

Paste a raw DNA sequence or FASTA record. The tool normalizes whitespace and
case locally. Do not treat computed ORFs or restriction sites as experimental
validation.

DNA配列またはFASTAを貼り付けます。入力配列は外部へ送信されません。結果は実験前に
必ず独立に確認してください。

## Verify / 検証

```powershell
.\start_windows.ps1
$state = Get-Content .runtime\run.json -Raw | ConvertFrom-Json
Invoke-WebRequest $state.url -UseBasicParsing
.\stop_windows.ps1
```

## Clean removal / 完全削除

Run `stop_windows.ps1`, then delete the cloned folder. There are no global
dependencies, databases, virtual environments, or user-data folders created by
this project.

## Privacy, license, and contributors

Analysis is browser-only. No genome, sequence, accession, credential, personal
path, or result is bundled. MIT License. See [CONTRIBUTORS.md](CONTRIBUTORS.md).
