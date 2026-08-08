# This is how Promptic Works
There is a feed, with an input section in the bottom,
Items are added from the feed
/clear clears the feed and returns to home screen
/notes open a select section where users can choose a folder and subfolder and select a note -> when Note selected then only it goes from feed to note view/edit section
/notes add [title] shows the folders and sub folders with two new options, create folder and ---(to have the note in the root itself)
/todos has a --daily and --weekly flag to work with todos that need to be done in a daily or weekly manner, theese reset every day/week and before reseting its prev data is saved for consistency
/todos add [title] ads a todo 
/todos shows all the todos, with status backlog/current/future - use shortcuts to convert one from the There
/reminders is simple, add a reminder that works through an email service(the text is parsed by AI to set a proper reminder at a proper time)
/hey starts a new chat session, that can be continued through something Ill figure out later


## The feed
The feed is a simple pane with an array of items with {id, render} to show something in the feed
/clear will just clear the field

## The notes

