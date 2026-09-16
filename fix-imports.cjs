const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const locations = {
  pages: ['LandingPage', 'DetailsPage', 'ApplicationPage', 'ThankYouPage', 'Login', 'AdminDashboard', 'SuperadminDashboard', 'UserProfile'],
  'components/ui': ['CustomCursor', 'AmbientBackground', 'LogoutModal', 'GuestProfileModal'],
  'components/panels': ['UserOverviewPanel', 'UserApplicationPanel', 'UserEventPanel', 'UserInvitationPanel', 'UserNotificationPanel', 'UserHelpPanel', 'UserManagementPanel', 'UserProfilePanel', 'AdminOverviewPanel', 'UserAssignedGuestsPanel'],
  'components/modules': ['AnalyticsModule', 'ApplicationsModule', 'EventsModule', 'GuestsModule', 'InvitationsModule', 'SettingsModule', 'AdminReportsModule', 'AdminManageUsersModule', 'AdminProfileModule', 'AdminAssignedEventsModule']
};

const getNewPath = (componentName, currentFilePath) => {
  let targetFolder = null;
  for (const [folder, components] of Object.entries(locations)) {
    if (components.includes(componentName)) {
      targetFolder = folder;
      break;
    }
  }
  if (!targetFolder) return null;

  const currentFolder = path.relative(srcDir, path.dirname(currentFilePath)).replace(/\\/g, '/');
  
  // Calculate relative path from currentFolder to targetFolder
  let relPath = path.posix.relative(currentFolder, targetFolder);
  if (!relPath.startsWith('.')) relPath = './' + relPath;
  if (relPath === './') relPath = '.';
  
  return `${relPath}/${componentName}`;
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Regex to match imports: import ... from './components/X' or '../components/X' or './X' or '../X'
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  
  content = content.replace(importRegex, (match, importPath) => {
    // Only process internal imports
    if (importPath.startsWith('.')) {
      const parts = importPath.split('/');
      const componentName = parts[parts.length - 1];
      
      const newImportPath = getNewPath(componentName, filePath);
      if (newImportPath) {
        changed = true;
        return `from '${newImportPath}'`;
      }
    }
    return match;
  });

  // Also fix lazy loaded routes in App.tsx: import("./components/X")
  const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
  content = content.replace(dynamicImportRegex, (match, importPath) => {
    if (importPath.startsWith('.')) {
      const parts = importPath.split('/');
      const componentName = parts[parts.length - 1];
      
      const newImportPath = getNewPath(componentName, filePath);
      if (newImportPath) {
        changed = true;
        return `import('${newImportPath}')`;
      }
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated imports in ${path.relative(srcDir, filePath)}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walk(srcDir);
console.log('Import fix complete!');
