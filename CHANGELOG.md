# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `GET /metrics/latest` endpoint for the newest stored snapshot.
- `GET /metrics/current` endpoint for a live, on-demand read.
- Offset pagination on `/metrics` and `/alerts`.
- Configurable CORS origins via `ALLOWED_ORIGINS`.
- Edge-case and error-path test coverage across API, alerting, and collector.
- Project tooling: `.editorconfig`, `.gitattributes`, `Makefile`, and Dependabot.

### Changed
- Network volume totals are scaled by the configured collection interval.

### Fixed
- `check_thresholds` now guards against missing metric keys.

[Unreleased]: https://github.com/harshh-0304/Linux-monitoring-system/commits/main
