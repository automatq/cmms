# Calendar Status Color Coding

This document describes the color coding system implemented in the CMMS calendar view.

## Overview
The CMMS calendar displays maintenance events with color coding based on their status, making it easy to visually identify the state of scheduled work orders, preventive maintenance tasks, and other events at a glance.

## Color Scheme

### Status-Based Colors
The calendar prioritizes status-based coloring over event type when a status is available:

- **Green (Emerald)**: Completed events
  - Work orders that have been completed
  - Preventive maintenance tasks that have been finished
  - Any task marked as "completed"

- **Amber/Yellow**: Pending events
  - Work orders awaiting approval or scheduling
  - Scheduled tasks that have not yet started
  - Any task marked as "pending"

- **Blue**: In Progress events
  - Work orders currently being worked on
  - Active maintenance tasks
  - Any task marked as "in_progress"

- **Red**: Cancelled or Overdue events
  - Work orders that have been cancelled
  - Tasks that are past their due date (overdue)
  - Any task marked as "cancelled" or "overdue"

### Fallback Event Type Colors
If no status is available, the calendar falls back to event type-based coloring:

- **Blue**: Work Orders
  - General maintenance work orders
  - Repair requests
  - Service requests

- **Green (Emerald)**: Preventive Maintenance (PM)
  - Scheduled maintenance tasks
  - Recurring maintenance schedules
  - Compliance-related tasks

- **Red**: Downtime Events
  - Equipment downtime records
  - Unscheduled maintenance events
  - Emergency repairs

## Benefits
- **Quick Visual Assessment**: Identify urgent or overdue tasks instantly
- **Improved Planning**: Easily see which tasks are completed vs. pending
- **Enhanced Productivity**: Technicians can prioritize based on visual cues
- **Better Oversight**: Management can quickly assess team performance

## Implementation Details
- The color coding is implemented in the `DashboardCalendar` component
- Colors are applied using Tailwind CSS classes
- Hover effects provide additional visual feedback
- The system maintains accessibility standards with appropriate contrast ratios

## Usage Tips
- Regularly update task statuses to maintain accurate color representation
- Use the calendar view for daily planning and task prioritization
- Train team members to recognize color meanings for efficient communication
- Combine with other filters and views for comprehensive scheduling