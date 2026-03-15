Refined Analysis of the Design Document

Project: Project ManageWare – Hardware Purchase and Inventory Management System

This analysis explains the purpose, scope, functionality, system modules, user roles, operational workflow, and constraints of the Project ManageWare system as specified in the design document.

1. Purpose of the Project

The purpose of Project ManageWare is to provide a centralized system for tracking, procuring, and managing hardware assets across multiple properties.

The system addresses challenges such as:

Inefficient hardware inventory tracking

Lack of centralized asset visibility

Manual procurement processes

Difficulty monitoring asset lifecycle status

Limited integration between procurement and financial systems

Lack of real-time inventory information

The platform will allow organizations to manage hardware assets and procurement activities through a cloud-hosted web interface. 

design 3

2. Industry Being Targeted

The system is intended for organizations that manage hardware assets distributed across multiple real estate properties.

Typical environments where the system may be used include:

Property management organizations

Companies managing multiple office locations

Facility management departments

Organizations operating infrastructure across several properties

These organizations require systems that allow them to track hardware assets, monitor inventory levels, and manage procurement activities efficiently.

3. Complete Functional Scope of the System

According to the design document, the system supports the following core functional areas:

User access and authentication

Hardware asset management

Inventory tracking

Procurement request and approval management

Purchase order generation

Asset lifecycle status updates

Property asset tracking

Reporting and data analysis

Activity logging and audit tracking

These functions collectively support the management of hardware assets throughout their operational lifecycle.

4. User Roles in the System

The system uses role-based access control to restrict system functionality based on user responsibilities. 

design 3

The primary roles identified in the design document include:

1. Property Manager

Property managers are responsible for requesting and tracking hardware assets for their properties.

Their tasks include:

Submitting hardware requests

Viewing assets assigned to properties

Monitoring inventory levels

Tracking asset distribution

2. Finance Director

Finance directors are responsible for reviewing and approving procurement requests.

Their tasks include:

Reviewing purchase requests

Approving or rejecting procurement requests

Monitoring purchase order generation

Reviewing financial reports related to procurement

3. IT Specialist

IT specialists manage the technical aspects of hardware asset tracking.

Their responsibilities include:

Managing asset records

Updating asset lifecycle status

Monitoring hardware inventory

Ensuring asset tracking accuracy

5. Major System Components

The design document describes several major components of the system architecture.

5.1 Web Interface

The web interface provides a mobile-responsive dashboard through which users interact with the system. 

design 3

The interface supports:

User authentication

Dashboard views

Asset tracking interfaces

Procurement request submission

Reporting displays

The interface must also support cross-browser compatibility.

5.2 Application Server

The application server processes system logic and manages communication between system components.

Its responsibilities include:

Authentication and authorization

Processing user requests

Handling business logic

Managing API interactions

5.3 Inventory Management Module

This module manages all asset and inventory related activities.

Capabilities include:

Tracking hardware assets

Generating unique asset identifiers

Monitoring asset lifecycle status

Tracking inventory quantities

Monitoring inventory threshold levels

5.4 Procurement Module

The procurement module manages the process of requesting and approving hardware purchases.

Capabilities include:

Submitting hardware purchase requests

Reviewing and approving procurement requests

Generating purchase orders

Integrating with financial systems

The system automatically generates purchase orders after approval. 

design 3

5.5 Database System

The database stores all system data including:

Hardware asset records

Property information

Purchase requests

Purchase orders

financial data

system logs

reporting data

6. Data Entities in the System

The document identifies several key entities involved in system operations.

Users

Stores system users and their roles.

Possible fields include:

User ID

Name

Role

Contact details

Login credentials

Properties

Represents locations where hardware assets are deployed.

Fields may include:

Property ID

Property name

Location

Description

Assets

Represents individual hardware devices tracked by the system.

Fields may include:

Asset ID

Unique asset identifier

Asset type

Lifecycle status

Assigned property

Purchase information

Inventory

Tracks available hardware quantities.

Fields may include:

Inventory ID

Asset type

Quantity available

Inventory threshold

Purchase Requests

Records hardware requests submitted by property managers.

Fields may include:

Request ID

Requesting user

Asset type

Quantity

Status

Purchase Orders

Generated after financial approval of a purchase request.

Fields may include:

Purchase order ID

Associated request

Total cost

Purchase order document

Audit Logs

Records system activity for accountability and tracking.

Fields may include:

Log ID

User performing the action

Action performed

Timestamp

Affected record

7. Operational Workflow

The design document outlines the following process flow:

A property manager submits a hardware request through the web interface.

The request is sent to the application server.

The finance director reviews the request.

If approved, the system automatically generates a purchase order.

The purchase order is recorded in the database.

Inventory records are updated.

Updated asset information is returned to the application server.

The user dashboard displays updated system information.

This workflow ensures that procurement and inventory updates occur in a structured process.

8. Reporting and Analytics

The system must generate several operational reports.

These include:

Inventory Reports

Provide information about available hardware and inventory levels.

Weekly Inventory Accuracy Reports

Measure the accuracy of inventory records.

Financial Variance Reports

Compare procurement spending against financial records.

Asset Aging Reports

Provide insight into how long assets have been in service.

Asset Distribution Dashboard

Displays how hardware assets are distributed across properties.

9. Non-Functional Requirements

The system must meet several technical requirements.

Security

AES-256 encryption for stored data

Role-based authentication

Secure access control

Availability

The system must maintain high availability for users.

Compatibility

The web interface must support multiple browsers and mobile devices.

Infrastructure Constraints

The system must:

Run on existing infrastructure

Avoid requiring new server hardware

Support cloud deployment environments such as AWS or Azure

10. System Constraints

The project has several implementation limitations.

Budget

Maximum project budget:

KSh 350,000

Project Deadline

The system must be completed by:

April 24, 2026

Infrastructure Requirements

The system must operate using the organization’s existing infrastructure.

11. Final System Capabilities

When completed, the system will be capable of:

Tracking hardware assets across properties

Generating unique asset identifiers

Managing hardware inventory

Monitoring inventory thresholds

Processing hardware purchase requests

Approving procurement requests

Automatically generating purchase orders

Integrating with financial systems

Producing inventory and financial reports

Maintaining system activity logs

Providing dashboards for asset distribution

Supporting secure role-based access