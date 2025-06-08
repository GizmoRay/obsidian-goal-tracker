# Goal Tracker Plugin for Obsidian

A simple and flexible goal tracking plugin for Obsidian that allows you to track your goals using daily, weekly, or monthly views.

_Does not require any other plugins, or custom-coding. Just use the markup format below and everything works_

## Features

- Three different tracking views:
  - Daily: Track goals on a day-by-day basis
  - Weekly: Track goals week by week
  - Monthly: Track goals month by month
- Customizable titles for each tracker
- Data stored directly in your notes
- Clean, minimal interface that matches Obsidian's aesthetic

## Usage

### Adding a Tracker

To add a goal tracker to your note, create a code block with the `goal-calendar` language and specify your options:

- daily

  <img width="712" alt="image" src="https://github.com/user-attachments/assets/ccd5067f-661d-49c1-8684-b09999662c6f" />

- weekly

  <img width="720" alt="image" src="https://github.com/user-attachments/assets/b774015a-9a3c-4772-b3ae-50cc49b5ab74" />

- monthly

  <img width="673" alt="image" src="https://github.com/user-attachments/assets/9640b76e-0e91-4d31-b381-ab7e5998f7f8" />

#### Streak tracker

Use "streak: on" within the configuration to enable a longest recent streak feature.

Example:

```goal-calendar
type: weekly
title: No wasted weekends - do something fun every weekend
streak: on
{
  "id": "1d38cb0a-a6bc-44d4-9726-0fba43da17f6",
  "type": "weekly",
  "title": "No wasted weekends - do something fun every weekend",
  "goals": {
    "2025-W1": true,
    "2025-W2": true
  }
}
```

<img width="669" alt="image" src="https://github.com/user-attachments/assets/7dbddb37-d102-4165-9751-3ddba407b99f" />
