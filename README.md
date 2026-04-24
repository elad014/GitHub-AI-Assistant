GitHub AI Assistant

Project Description

GitHub AI Assistant is a web-based system designed to help developers understand and analyze GitHub repositories using artificial intelligence.

The system allows users to enter a GitHub repository link and ask questions about the code in natural language. The backend retrieves information from the repository through the GitHub API and processes it using an AI model to generate explanations and insights about the project.

The project ships in two versions that share the same frontend and core backend logic but differ in their AI provider and event infrastructure:

- Local version — runs fully on your own machine using Ollama (local LLM) and Apache Kafka for event streaming.
- Cloud version — deployed to the internet using the Anthropic API (Claude) as the AI provider, with no Kafka dependency.

The goal of the project is to improve developer productivity by enabling faster understanding of unfamiliar codebases.

Team Members

Name 1 – Elad Natan

Name 2 – Ofir Goldstein

Name 3 – Daniel ladishanski

Name 4 – Noam Khaimob

Name 5 - Tomer Goldman

Main Features

Analyze GitHub repositories

Ask questions about the code in natural language

Generate explanations of project structure

Store user questions and AI responses

Provide usage analytics for system interactions

Versions

Local Version (branch: local_version)

Intended for running the full stack on a developer machine.

AI Model: Ollama — a locally hosted LLM, no external API key required.

Event Streaming: Apache Kafka — all interactions are published to a Kafka topic before being persisted.

Database: Neon PostgreSQL (or any PostgreSQL instance).

Requirements: Docker, Docker Compose, a machine capable of running a local LLM.

Cloud Version (branch: main)

Intended for cloud deployment (e.g. Render, Railway, Fly.io).

AI Model: Anthropic API (Claude) — requires an ANTHROPIC_API_KEY environment variable.

Event Streaming: none — interactions are written directly to the database, keeping the deployment simple and stateless.

Database: Neon PostgreSQL.

Requirements: Docker, an Anthropic API key, a cloud PostgreSQL connection string.

System Architecture

Both versions share the same three-layer architecture:

Frontend (UI)
Web interface that allows users to interact with the AI assistant.

Backend (Server)
FastAPI server responsible for processing requests and communicating with GitHub and the AI model.

AI Model
Local version: Ollama (local LLM, no internet required).
Cloud version: Anthropic Claude via the Anthropic API.

Event Infrastructure
Local version: Apache Kafka message queue logs interactions before they reach the database.
Cloud version: direct database writes — no message broker.

Database
Neon PostgreSQL used to store interaction history and analytics.

Technologies Used

Frontend: React (Vite)

Backend: Python (FastAPI)

AI Model (local): Ollama

AI Model (cloud): Anthropic API (Claude)

Messaging System (local only): Apache Kafka

Database: Neon PostgreSQL

Repository Integration: GitHub API

Environment Variables

Cloud version (.env)

ANTHROPIC_API_KEY=      # Anthropic API key
ANTHROPIC_MODEL=        # e.g. claude-3-5-sonnet-20241022
DATABASE_URL=           # PostgreSQL connection string
GITHUB_TOKEN=           # GitHub personal access token
CHAT_HISTORY_SIZE=10    # Number of past Q&A pairs loaded per user/repo

Local version (.env)

OLLAMA_MODEL=           # e.g. llama3
DATABASE_URL=           # PostgreSQL connection string
GITHUB_TOKEN=           # GitHub personal access token
KAFKA_BOOTSTRAP=        # e.g. localhost:9092
CHAT_HISTORY_SIZE=10

Project Goal

The project demonstrates how artificial intelligence can be integrated with software development tools in order to accelerate onboarding and code comprehension. By offering both a local and a cloud-ready deployment, it supports a range of usage scenarios from offline development to production-grade hosting.
