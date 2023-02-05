# Employees' Productivity test project

## Resume
In this project, we implemented a simple dashboard with a simple view and update operations with employees.

I decided to fetch all data during the loading process of the dashboard page because we have only a simple getAllData API method. If we could fetch common summarize data I would use server side pagination. But not in this case.

Saving process based on comparing unedited data and edited and patch-only edited data through shifts and employees patch API methods.

About TSLint. It's deprecated and I decided to use `es-lint + prettier` plugin. Modified only `printWidth`.

Wrote some tests for hours calculation methods. Didn't have time to find a good timepicker component for editing hours/minutes. Used `type="time"` HTML5 version.
