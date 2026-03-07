GitHub AI Assistant
Project Description

GitHub AI Assistant is a web-based system designed to help developers understand and analyze GitHub repositories using artificial intelligence.

The system allows users to enter a GitHub repository link and ask questions about the code in natural language. The backend retrieves information from the repository through the GitHub API and processes it using a locally hosted AI model to generate explanations and insights about the project.

In addition, the system records user interactions using a messaging system (Kafka) and stores them in a cloud database (Neon PostgreSQL) for analysis and monitoring.

The goal of the project is to improve developer productivity by enabling faster understanding of unfamiliar codebases.

Team Members

Name 1 – Elad Natan

Name 2 – Ofir Goldstein

Name 3 – Daniel ladishanski

Name 4 – Noam Khaimob


Main Features

Analyze GitHub repositories

Ask questions about the code in natural language

Generate explanations of project structure

Store user questions and AI responses

Provide usage analytics for system interactions

System Architecture

The system consists of several main components:

Frontend (UI)
Web interface that allows users to interact with the AI assistant.

Backend (Server)
API server responsible for processing requests and communicating with GitHub and the AI model.

AI Model
Local AI model (running via Ollama) that analyzes code and generates responses.

Message Queue
Kafka is used to log user interactions and system events.

Database
Neon PostgreSQL database used to store interaction data and analytics.

Technologies Used

Frontend: Web UI

Backend: Python (FastAPI)

AI Model: Ollama (Local LLM)

Messaging System: Apache Kafka

Database: Neon PostgreSQL

Repository Integration: GitHub API

Project Goal

The project demonstrates how artificial intelligence can be integrated with software development tools in