// MongoDB initialization script
// This creates a dedicated user for your application

print('Starting MongoDB initialization...');

// Switch to the application database
db = db.getSiblingDB(process.env.MONGO_DATABASE || 'collaborative-task-manager');

try {
  // Create the application user
  db.createUser({
    user: process.env.MONGO_APP_USERNAME || 'taskmanager_user',
    pwd: process.env.MONGO_APP_PASSWORD || 'SecureAppPass2024!',
    roles: [
      {
        role: 'readWrite',
        db: process.env.MONGO_DATABASE || 'collaborative-task-manager'
      }
    ]
  });
  
  print('Application user created successfully for database: ' + (process.env.MONGO_DATABASE || 'collaborative-task-manager'));
  print('Username: ' + (process.env.MONGO_APP_USERNAME || 'taskmanager_user'));
  
} catch (error) {
  print('Error creating user: ' + error);
}