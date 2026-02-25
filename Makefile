# Dots and Boxes — run tests (use from WSL)
# From repo root (game/): make prolog-tests, make python-tests, etc.
# Python: create venv first: python3 -m venv .venv && .venv/bin/pip install pytest
# Java: wrapper only. One-time in src/java: gradle -b wrapper.gradle wrapper --gradle-version 9.3.1

PYTHON ?= .venv/bin/python

.PHONY: prolog-tests python-tests java-tests csharp-tests all

prolog-tests:
	swipl -q -g run_tests -t halt -s tests/prolog/test_dab.pl

python-tests:
	PYTHONPATH=src/python $(PYTHON) -m pytest tests/python -q

java-tests:
	cd src/java && bash ./gradlew test

csharp-tests:
	cd src/csharp && dotnet test

all: prolog-tests python-tests java-tests csharp-tests
