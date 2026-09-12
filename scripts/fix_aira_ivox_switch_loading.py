from pathlib import Path

path = Path("src/components/chat/PublicChatWidget.jsx")
text = path.read_text()
old = '''      setAiraAvatarRuntime(null);\n      if (assistant.key === "aira-webchat-public" || assistant.key === "ivox-webchat-public") {\n        await loadAiraAvatarRuntime(true, assistant.key);\n      }\n    } catch (err) {'''
new = '''      setAiraAvatarRuntime(null);\n      if (assistant.key === "aira-webchat-public" || assistant.key === "ivox-webchat-public") {\n        void loadAiraAvatarRuntime(true, assistant.key);\n      }\n    } catch (err) {'''
count = text.count(old)
if count == 1:
    path.write_text(text.replace(old, new, 1))
    print("Made target-avatar refresh non-blocking so switch loading always clears.")
elif new in text:
    print("Switch loading follow-up already applied.")
else:
    raise SystemExit(f"Expected one switch-success runtime block, found {count}")
