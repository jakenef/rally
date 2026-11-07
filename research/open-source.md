# Open source we can use

Researched 2026-11-06. Licenses and maintenance not verified unless noted: check before building on a repo.

## Vision pipeline

| Repo | What it gives us | Notes |
|---|---|---|
| [ArvanJ/Pickleball-Vision](https://github.com/ArvanJ/Pickleball-Vision) | YOLO + ByteTrack player tracking, court homography, hits and bounces, shot types, rallies, faults, pose-based stroke form, heatmaps, dashboard | **Fork this.** Also has a [browser version](https://arvanj.github.io/Pickleball-Vision/) (YOLOv8n via onnxruntime-web, ~2 fps clip analysis, no pose). License: check. |
| [Ovar9000/pickleballOS](https://github.com/Ovar9000/pickleballOS) | One fixed camera, click-the-corners calibration, SQLite output, rankings | Thesis project; simpler fallback |
| [ryjchen24/pickleball](https://github.com/ryjchen24/pickleball) | Fine-tuned YOLOv8 + ByteTrack, RTMPose, ST-GCN shot classifier | Parts to borrow |
| [santhosharun99/picklytics](https://github.com/santhosharun99/picklytics) | YOLO11 + temporal heatmap ball tracking, 3D flight model | In development |
| [shaziaanwar6/PickleSight](https://github.com/shaziaanwar6/PickleSight) | Pose and movement only (YOLOv8-Pose, ByteTrack) | No ball tracking |
| [davidpagnon/Sports2D](https://github.com/davidpagnon/Sports2D) | RTMPose 2D pose and joint angles from video | For ready position and footwork |

## Ball tracking (skip at the hackathon)

- TrackNetV2 adapted to pickleball: [UF project](https://hudsondev.pages.dev/pickleball), [Rochester project](https://www.hajim.rochester.edu/senior-design-day/pickleball-analytics/). Struggles with angled shots and occlusion.
- [Usmankalera-dev/tennis-analyzer](https://github.com/Usmankalera-dev/tennis-analyzer): TrackNet + court homography, tennis.

## Datasets

- [Roboflow Universe: pickleball](https://universe.roboflow.com/search?q=pickleball): a 7.5k-image set (ball, paddle, person) and a 2.4k set (ball, player), both with trained models.

## Models and APIs

- **Gemini video API**: samples 1 frame per second by default, which misses fast motion. Set a custom fps (e.g. 5) for shot labeling. [Docs](https://ai.google.dev/gemini-api/docs/interactions/video-understanding)
- **Claude**: takes still frames, not video. Use it for player cards, coaching tips and parsing facility rules from plain English.
- **OpenSkill** (`pip install openskill`, also on npm as `openskill`): team ratings, works for 2v2, updates after every game. [Paper](https://joss.theoj.org/papers/10.21105/joss.05901.pdf)
- **Realtime voice** (stretch, for backfill calls): xAI Grok Voice Agent API or ElevenLabs Realtime.
