#!/bin/bash
# Mac launcher — double-click in Finder to start StudentTrack
# (If blocked by Gatekeeper: right-click → Open the first time)
cd "$(dirname "$0")"
python3 launch.py
