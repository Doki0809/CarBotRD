import re

file_path = '/Users/jean/carbotSystem/src/App.jsx'

logic_replacement = """    // Fetch user profile when logged in
    if (isLoggedIn && currentUserEmail) {
      const fetchUserProfile = async () => {
        const userId = currentUserEmail.replace(/\./g, '_');
        const userDocRef = doc(db, "users", userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data());
        } else {
          const defaultProfile = {
            name: currentUserEmail.split('@')[0],
            email: currentUserEmail,
            dealerId: 'defaultDealer',
            dealerName: 'Mi Dealer',
            jobTitle: 'Vendedor',
            role: 'Admin',
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, defaultProfile);
          setUserProfile(defaultProfile);
        }
      };
      
      fetchUserProfile();
    } else {
       setUserProfile(null);
    }
  }, [isLoggedIn, currentUserEmail]);

  const handleUpdateProfile = async (updatedData) => {
    if (!currentUserEmail) return;
    try {
      const userId = currentUserEmail.replace(/\./g, '_');
      const userRef = doc(db, "users", userId);
      const allowedUpdates = {
        name: updatedData.name,
        jobTitle: updatedData.jobTitle,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(userRef, allowedUpdates);
      setUserProfile(prev => ({ ...prev, ...allowedUpdates }));
      showToast("Perfil actualizado correctamente");
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("Error al actualizar perfil", "error");
    }
  };"""

with open(file_path, 'r') as f:
    content = f.read()

# We need to find the block starting with `// Fetch user profile when logged in` 
# and replacing until the end of that useEffect, and then inserting handleUpdateProfile.
# The issue is the previous mess created duplicate/bad blocks. 
# Let's target: `// Fetch user profile when logged in` ... `[isLoggedIn, currentUserEmail]);`

# Regex needs to be careful.
regex = r"(\/\/ Fetch user profile when logged in.*?\[isLoggedIn, currentUserEmail\]\);)(.*?)(const handleUpdateProfile = async \(updatedData\) => \{[\s\S]*?\};)?"

# Actually, let's just find the `useEffect` block for user profile and replace it + append the function.
search_str = "// Fetch user profile when logged in (usando email ya que no hay auth.currentUser real)"

start_idx = content.find(search_str)
if start_idx == -1:
    print("Could not find start marker.")
    # Try alternate marker or fuzzy match
    search_str = "// Fetch user profile when logged in"
    start_idx = content.find(search_str)

if start_idx != -1:
    # Find the closing of useEffect
    # We look for `}, [isLoggedIn, currentUserEmail]);`
    end_marker = "}, [isLoggedIn, currentUserEmail]);"
    end_idx = content.find(end_marker, start_idx)
    
    if end_idx != -1:
        end_blk = end_idx + len(end_marker)
        
        # Check if handleUpdateProfile exists right after (due to previous partial edits)
        # We will just replace everything from start_idx to end_blk and append our clean code
        # But we also want to remove any subsequent malformed handleUpdateProfile if present
        
        # Let's inspect what's after
        pass 
        
        final_content = content[:start_idx] + logic_replacement + content[end_blk:]
        
        # Naive cleanup of double function if needed, but let's assume we are replacing the corrupted block
        # The previous tool failed so the file might still be in the 'bad' state or 'original' state?
        # If replace_file_content failed, the file is UNCHANGED. So we are acting on the file state BEFORE the error.
        # Wait, if `replace_file_content` failed, then the file is in the state BEFORE the bad edit.
        # So we just need to replace the original useEffect with (useEffect + handleUpdateProfile).
        
        with open(file_path, 'w') as f:
            f.write(final_content)
        print("Successfully updated logic.")
    else:
        print("Could not find end marker.")
else:
    print("Could not find start marker.")
