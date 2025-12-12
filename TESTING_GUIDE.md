# 🎵 Professor App - Complete Testing Guide

## 🚀 Quick Access
**App URL:** https://elprofe-app.preview.emergentagent.com

---

## 🆕 What's New!

### ✅ Enhanced Synonym Tool
- Now powered by **Datamuse API** - finds synonyms for ANY English word
- Try words like: "beautiful", "amazing", "create", "melody", "emotion", etc.
- Returns up to 15 relevant synonyms

### ✅ Demo Collaborative Song
- Pre-loaded song with **3 writers** already collaborating
- View real contribution tracking and splits
- See how multi-writer songs work

### ✅ Add Collaborators Feature
- Invite other users to your songs via email
- Click "+ Add Writer" button in the editor
- Test with demo accounts below

---

## 👥 Demo Accounts (Pre-created for Testing)

### Account 1: Sarah Johnson (Pro Writer)
```
Email: writer1@demo.com
Password: Demo123!
Role: Writer
Plan: Pro ✨
```

### Account 2: Michael Chen (Pro Producer)
```
Email: producer1@demo.com
Password: Demo123!
Role: Producer
Plan: Pro ✨
```

### Account 3: Emily Rodriguez (Free Composer)
```
Email: composer1@demo.com
Password: Demo123!
Role: Composer
Plan: Free
```

**Demo Song:** "Midnight Dreams (Demo Song)" - visible in all 3 accounts!

---

## 🧪 Complete Test Scenarios

### Test 1: View Collaborative Song (5 min)
**Login as:** writer1@demo.com / Demo123!

1. ✅ Dashboard shows "Midnight Dreams (Demo Song)"
2. ✅ Click the song to open editor
3. ✅ See full lyrics with multiple sections
4. ✅ Go to **Contributions** tab → See 3 writers with character counts
5. ✅ Go to **Splits** tab → See proposal: 40% / 35% / 25%
6. ✅ Try signing the split and exporting PDF

**Expected:** All contribution data and splits visible, PDF exports successfully

---

### Test 2: Enhanced Synonym Tool (3 min)
**Login as:** Any account

1. ✅ Open any song in editor
2. ✅ Select a word (double-click or drag to select)
3. ✅ Go to **Tools** tab → See synonyms
4. ✅ Try searching for words manually:
   - Type "beautiful" → Click search
   - Type "melody" → Click search
   - Type "passion" → Click search
   - Type "writing" → Click search

**Expected:** Synonyms appear for all words (powered by Datamuse API)

**Note:** If a word has no synonyms, try a simpler/more common word

---

### Test 3: Add Collaborator to Your Song (7 min)
**Step 1:** Login as writer1@demo.com / Demo123!

1. ✅ Create a new song: "Test Collaboration"
2. ✅ Open the song in editor
3. ✅ Look at left sidebar → See **Collaborators** section
4. ✅ Click **"+ Add Writer"** button
5. ✅ Enter email: `producer1@demo.com`
6. ✅ Click "Add Collaborator"
7. ✅ Toast notification: "Collaborator added!"

**Step 2:** Logout and login as producer1@demo.com / Demo123!

1. ✅ Dashboard now shows "Test Collaboration" song
2. ✅ Open it and see you can edit lyrics
3. ✅ Type some lyrics
4. ✅ Go to Contributions tab → See both writers

**Expected:** Both users can see and edit the same song, contributions tracked separately

---

### Test 4: Free vs Pro Plan (5 min)
**Login as:** composer1@demo.com / Demo123! (Free account)

1. ✅ Try to access **Splits** tab in any song
2. ✅ See "Pro plan required" message with Crown icon
3. ✅ Click **"Upgrade to Pro"** in dashboard
4. ✅ Toast: "Upgraded to Pro!"
5. ✅ Open song again → Splits tab now accessible
6. ✅ Create split proposal
7. ✅ Sign split
8. ✅ Export PDF

**Expected:** Pro features locked until upgrade, then fully accessible

---

### Test 5: Create Songs from Scratch (10 min)
**Login as:** Your own new account

1. ✅ Register: Click "START FREE"
2. ✅ Complete profile (all fields required)
3. ✅ Create 3 songs (free limit)
4. ✅ Try creating 4th → Error: "Free plan limited to 3 songs"
5. ✅ Upgrade to Pro
6. ✅ Create 4th song → Works!
7. ✅ Open any song, type lyrics
8. ✅ Add a demo collaborator: `writer1@demo.com`
9. ✅ Test synonym tool
10. ✅ Check contributions tracking

**Expected:** All features work, free plan enforced, Pro unlocks everything

---

### Test 6: Multi-User Collaboration (Advanced - 15 min)
**Requires:** 2 browser windows or devices

**Window 1:** Login as writer1@demo.com  
**Window 2:** Login as producer1@demo.com

1. ✅ **Window 1:** Create new song "Live Collaboration Test"
2. ✅ **Window 1:** Add producer1@demo.com as collaborator
3. ✅ **Window 2:** Refresh → Song appears
4. ✅ **Window 1:** Type first verse
5. ✅ **Window 2:** See the verse (may need refresh)
6. ✅ **Window 2:** Add second verse
7. ✅ **Window 1:** Refresh → See both verses
8. ✅ Both users: Go to Contributions tab
9. ✅ See separate contribution counts for each user

**Expected:** Both users can edit, contributions tracked separately

---

## 🐛 Known Issues / Limitations

### Real-Time Sync
- **Current:** Changes appear after page refresh
- **Why:** WebSocket connection needs both users actively connected
- **Workaround:** Refresh page to see collaborator's changes

### Synonyms
- Works for common English words
- Obscure/slang words may have no results
- Limited to 15 results per search

### Demo Data
- Demo song is shared across all demo accounts
- All demo users can edit the demo song
- Your own songs are private unless you add collaborators

---

## 💡 Pro Tips

### For Best Experience:
1. **Use Chrome or Firefox** (best compatibility)
2. **Clear cache** if you see old data
3. **Refresh page** to see latest collaborator changes
4. **Try demo accounts first** to understand features
5. **Test synonym tool** with common words first

### Collaboration Testing:
1. Create song with your account
2. Add demo users as collaborators
3. Login as demo users to see the song
4. Each user's contributions tracked separately

### Advanced Testing:
1. Create multiple splits and compare versions
2. Test split approval workflow with multiple users
3. Export PDFs and check formatting
4. Try different PRO affiliations in profiles

---

## 📊 Features Checklist

### Landing Page
- [ ] Animations and hover effects work
- [ ] Logo visible and interactive
- [ ] Navigation buttons work
- [ ] Pricing section clear

### Authentication
- [ ] Can register new account
- [ ] Can login
- [ ] Profile completion required
- [ ] Dropdowns work correctly

### Dashboard
- [ ] Songs display in grid
- [ ] Can create songs
- [ ] Free plan limits work (3 songs)
- [ ] Pro upgrade works

### Editor
- [ ] Can type lyrics
- [ ] Character count updates
- [ ] Synonym tool finds words
- [ ] Add collaborator works
- [ ] Contributions tracked

### Pro Features
- [ ] Split management works
- [ ] Can create proposals
- [ ] Can sign splits
- [ ] PDF export works

### Collaboration
- [ ] Demo song visible to all demo users
- [ ] Can add collaborators by email
- [ ] Each user's contributions separate
- [ ] Multi-user editing works

---

## 🆘 Troubleshooting

### "User not found with that email"
- The email must belong to a registered user
- Try demo accounts: writer1@demo.com, producer1@demo.com, composer1@demo.com

### "Free plan limited to 3 songs"
- Click "Upgrade to Pro" button
- Mock payment - instant upgrade

### "Pro plan required"
- Some features need Pro subscription
- Upgrade from dashboard or settings

### Synonym tool returns empty
- Try a more common word
- Check spelling
- Some words have no synonyms

### Can't see collaborator's changes
- Refresh the page
- Real-time sync requires both users active simultaneously

---

## 🎯 Quick Test (2 minutes)

1. Visit: https://elprofe-app.preview.emergentagent.com
2. Login: writer1@demo.com / Demo123!
3. Open: "Midnight Dreams (Demo Song)"
4. Check tabs: Lyrics → Tools → Contributions → Splits
5. Try synonym tool: select word "night" → see synonyms
6. Done! ✅

---

## 📞 Need More Help?

- Check browser console (F12) for errors
- Try different browser
- Clear cache and cookies
- Test with demo accounts first
- Verify internet connection

**Ready to test? Start here:** https://elprofe-app.preview.emergentagent.com

🎵 Happy Testing! 🎵
