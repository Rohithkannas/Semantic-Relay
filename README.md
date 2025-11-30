# [CLIQTRIX '26] Relay: Smart OOO Handover Protocol

## Introduction

Relay is a smart out-of-office (OOO) handover protocol that transforms static vacation messages into dynamic, context-aware message routing. By combining an intuitive widget interface with an intelligent bot, Relay ensures critical communications never fall through the cracks while team members are away, maintaining seamless collaboration continuity in modern workplaces.

## Why This Project? (The Pain Point)

In today's "always-on" work culture, team silos and inefficient static OOO messages create significant productivity gaps. When key personnel go offline, critical messages get lost, urgent requests face delays, and return-to-work backlogs become overwhelming. Traditional OOO responses are passive and unhelpful - they notify but don't solve. Relay provides a **Collaboration-Centric** solution that actively manages communication flow, ensuring the right person gets the right message at the right time, preserving operational efficiency even when team members are unavailable.

## Core Description

Relay operates as a seamless extension within Zoho Cliq, combining two powerful components:

- **Relay Panel Widget:** An intuitive interface where users create intelligent routing rules based on keywords, projects, or message content
- **RelayBot:** An automated assistant that intercepts messages, applies routing logic, and facilitates smooth handovers

All routing rules, logs, and configurations are persistent via Zoho Catalyst Data Store, ensuring continuity across sessions and providing comprehensive audit trails for post-vacation review.

## Detailed Use Case

### Scenario
A Project Manager (PM) is leaving for vacation and needs to ensure critical server-related issues are handled promptly.

### Action 1: Rule Creation
The PM uses the **Relay Panel Widget** to add a rule:
- **Keyword:** "Server"
- **Route to:** DevOps Lead (Steve)
- **Action:** Immediate notification with message context

### Action 2: Incoming Message
A team member sends a message to the PM: "I need help with the database server."

### Result: Smart Handover
The **RelayBot** intercepts the message, identifies the keyword "Server", and executes the handover:

**Simulated Chat Log:**
```
[Team Member]: @PM I need help with the database server.

[RelayBot]: 🔄 **Message Handover Alert**
📤 From: Team Member
📨 To: PM (Currently OOO)
🔑 Keyword Detected: "Server"
➡️ Routed to: Steve (DevOps Lead)
📝 Original Message: "I need help with the database server."
✅ Action logged for PM's return report
```

The PM receives a comprehensive handover report upon return, detailing all routed messages and their resolutions.

## Technical Stack

### Platform
- **Zoho Catalyst:** Serverless backend and data persistence
- **Zoho Cliq:** Collaboration platform and integration environment

### Backend
- **Node.js Advanced I/O Function:** `relay_core`
  - Express.js server for webhook handling
  - Catalyst SDK for database operations
  - Message routing logic engine

### Database
- **Catalyst Data Store Tables:**
  - `HandoverRules`: User-defined routing configurations
  - `RelayLogs`: Comprehensive audit trail of all handover actions

### Frontend
- **HTML/CSS/JavaScript:** Modern widget interface
- **Hosted via Catalyst Client:** Seamless integration with Cliq platform

### Integration
- **Cliq Webhook Handler:** Message interception and processing
- **Deluge Bridge:** Secure communication between Cliq and Catalyst

## Installation & Deployment (For Judges)

### Prerequisites
- Node.js (v14 or higher)
- Zoho Catalyst CLI installed
- Zoho Cliq admin access

### Deployment Steps

1. **Install Dependencies:**
   ```bash
   cd Relay/functions/relay_core
   npm install
   ```

2. **Deploy to Catalyst:**
   ```bash
   cd Relay
   npx zcatalyst-cli deploy
   ```

3. **Configure Cliq Bot Handler:**
   - Navigate to Zoho Cliq Bot Settings
   - Set Message Handler URL to: `https://project-rainfall-906694720.development.catalystserverless.com/server/relay_core/bot-handler`
   - Enable webhook integration for message events

4. **Install Relay Widget:**
   - Add Relay Panel Widget to your Cliq workspace
   - Configure with your Catalyst project credentials

## Conclusion

Relay transforms the OOO experience from a communication blackout into a seamless collaboration continuum. By intelligently routing messages and maintaining comprehensive audit trails, Relay ensures organizational resilience while respecting work-life boundaries. The project's technical elegance lies in its simplicity - leveraging Catalyst's serverless architecture to deliver enterprise-grade functionality with zero infrastructure overhead. Relay is perfectly positioned for the Zoho Marketplace, addressing a universal pain point with a solution that enhances productivity without disrupting existing workflows.

## Contact Details

**Name:** Rohith Kanna S  
**LinkedIn:** https://www.linkedin.com/in/rohith4510/  
**Email:** rohithkanna.ss@gmail.com
