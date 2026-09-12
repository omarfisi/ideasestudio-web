from pathlib import Path

path = Path("src/components/chat/PublicChatWidget.jsx")
text = path.read_text()


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    text = text.replace(old, new, 1)


replace_once(
'''  getPublicChatAssistants,\n  getPublicChatEvents,''',
'''  getPublicChatAssistants,\n  getPublicChatDefaultAssistant,\n  getPublicChatEvents,''',
"default-assistant import",
)

replace_once(
'''  sendPublicChatMessage,\n  startPublicChat,\n} from "@/services/publicChatApi.js";''',
'''  sendPublicChatMessage,\n  startPublicChat,\n  switchPublicChatAssistant,\n} from "@/services/publicChatApi.js";''',
"switch-assistant import",
)

replace_once(
'''function storedAssistantKey() {\n  try {\n    const value = sessionStorage.getItem(ASSISTANT_STORAGE_KEY);\n    return value === "ivox-webchat-public" ? value : "aira-webchat-public";\n  } catch {\n    return "aira-webchat-public";\n  }\n}''',
'''function explicitStoredAssistantKey() {\n  try {\n    const value = sessionStorage.getItem(ASSISTANT_STORAGE_KEY);\n    return value === "aira-webchat-public" || value === "ivox-webchat-public" ? value : null;\n  } catch {\n    return null;\n  }\n}\n\nfunction storedAssistantKey() {\n  return explicitStoredAssistantKey() || "aira-webchat-public";\n}''',
"stored assistant helper",
)

old_assistant_block = '''  useEffect(() => {\n    let cancelled = false;\n    getPublicChatAssistants()\n      .then((items) => {\n        if (cancelled) return;\n        const next = Array.isArray(items) ? items : [];\n        setAssistants(next);\n        if (next.length > 0 && !next.some((item) => item.key === selectedAssistantKey)) {\n          const fallback = next[0].key;\n          setSelectedAssistantKey(fallback);\n          sessionStorage.setItem(ASSISTANT_STORAGE_KEY, fallback);\n        }\n      })\n      .catch(() => {\n        if (!cancelled) setAssistants([]);\n      });\n    return () => { cancelled = true; };\n  }, [selectedAssistantKey]);\n\n  const handleAvatarProfileChange = useCallback(async (profileSlug) => {\n    const assistant = assistants.find((item) => item.key === profileSlug) || { key: profileSlug, display_name: profileSlug };\n    if (profileSlug === selectedAssistantKey) {\n      await loadAiraAvatarRuntime(true, profileSlug);\n      return;\n    }\n    sessionStorage.setItem(ASSISTANT_STORAGE_KEY, profileSlug);\n    setSelectedAssistantKey(profileSlug);\n    if (sessionId) {\n      sessionStorage.removeItem(SESSION_STORAGE_KEY);\n      setSessionId(null);\n      setSessionReady(false);\n      setMessages([]);\n      setScreen("prechat");\n    }\n    setAiraAvatarRuntime(null);\n    if (assistant.key === "aira-webchat-public" || assistant.key === "ivox-webchat-public") {\n      await loadAiraAvatarRuntime(true, assistant.key);\n    }\n  }, [assistants, loadAiraAvatarRuntime, selectedAssistantKey, sessionId]);'''

new_assistant_block = '''  useEffect(() => {\n    let cancelled = false;\n    getPublicChatAssistants()\n      .then(async (items) => {\n        if (cancelled) return;\n        const next = Array.isArray(items) ? items : [];\n        setAssistants(next);\n        if (next.length === 0 || sessionId) return;\n\n        const explicitChoice = explicitStoredAssistantKey();\n        if (explicitChoice && next.some((item) => item.key === explicitChoice)) {\n          setSelectedAssistantKey(explicitChoice);\n          return;\n        }\n        if (explicitChoice) sessionStorage.removeItem(ASSISTANT_STORAGE_KEY);\n\n        let defaultKey = next[0].key;\n        try {\n          const selected = await getPublicChatDefaultAssistant();\n          if (cancelled) return;\n          if (next.some((item) => item.key === selected?.key)) defaultKey = selected.key;\n        } catch {\n          // Compatibility fallback: configured assistant order remains usable\n          // if Avatar Manager cannot resolve a public default temporarily.\n        }\n        if (!cancelled) setSelectedAssistantKey(defaultKey);\n      })\n      .catch(() => {\n        if (!cancelled) setAssistants([]);\n      });\n    return () => { cancelled = true; };\n  }, [sessionId]);\n\n  const handleAvatarProfileChange = useCallback(async (profileSlug) => {\n    const assistant = assistants.find((item) => item.key === profileSlug) || { key: profileSlug, display_name: profileSlug };\n    if (profileSlug === selectedAssistantKey) {\n      await loadAiraAvatarRuntime(true, profileSlug);\n      return;\n    }\n\n    // Before the visitor has completed prechat, assistant selection is only\n    // presentation state. Persist the explicit choice so /start uses it once\n    // verification succeeds.\n    if (!sessionId) {\n      sessionStorage.setItem(ASSISTANT_STORAGE_KEY, profileSlug);\n      setSelectedAssistantKey(profileSlug);\n      setAiraAvatarRuntime(null);\n      if (assistant.key === "aira-webchat-public" || assistant.key === "ivox-webchat-public") {\n        await loadAiraAvatarRuntime(true, assistant.key);\n      }\n      return;\n    }\n\n    // A live conversation switches assistants server-side. The source session\n    // stays untouched until the new scoped conversation is fully created; on\n    // any failure the visitor remains in the original open conversation and\n    // never returns to prechat.\n    const sourceSessionId = sessionId;\n    setIsStarting(true);\n    setError(null);\n    try {\n      const data = await switchPublicChatAssistant(sourceSessionId, profileSlug);\n      if (currentSessionIdRef.current !== sourceSessionId) return;\n      if (!data?.session_id) throw new Error("La respuesta de cambio no incluyó una sesión válida.");\n\n      const nextSessionId = data.session_id;\n      const initialQuickReplies = Array.isArray(data.quick_replies) ? data.quick_replies : [];\n      const greetingMessage = {\n        sendAttemptId: "greeting",\n        source: "greeting",\n        role: "assistant",\n        content: data.greeting || `Ahora estás conversando con ${assistant.display_name || "el asistente"}.`,\n        citations: [],\n      };\n\n      sessionStorage.setItem(ASSISTANT_STORAGE_KEY, profileSlug);\n      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({\n        session_id: nextSessionId,\n        chatbot_key: profileSlug,\n      }));\n      persistHistory([greetingMessage]);\n      persistQuickReplies(nextSessionId, initialQuickReplies);\n\n      setSelectedAssistantKey(profileSlug);\n      setSessionId(nextSessionId);\n      setSessionReady(true);\n      setMessages([greetingMessage]);\n      rootQuickRepliesRef.current = initialQuickReplies;\n      setAvailableQuickReplies(initialQuickReplies);\n      setQuickRepliesOpen(initialQuickReplies.length > 0);\n      setProjectFormOpen(false);\n      setInput("");\n      hasRealConversationRef.current = false;\n      knownServerIdsRef.current = new Set();\n      claimByServerIdRef.current = new Map();\n      setHandoffRequested(false);\n      persistHandoff(nextSessionId, false);\n      setHandoffRequestLoading(false);\n      setHumanActivePendingConfirmation(false);\n      handoffMutationEpochRef.current += 1;\n      setScreen("chat");\n      const sanitized = sanitizeResponder(data.responder);\n      if (sanitized) setResponder(sanitized);\n      setAiraAvatarRuntime(null);\n      if (assistant.key === "aira-webchat-public" || assistant.key === "ivox-webchat-public") {\n        await loadAiraAvatarRuntime(true, assistant.key);\n      }\n    } catch (err) {\n      if (currentSessionIdRef.current !== sourceSessionId) return;\n      setError(\n        err?.status === 409\n          ? (err.message || "No se puede cambiar de asistente mientras una persona atiende esta conversación.")\n          : "No se pudo cambiar de asistente. La conversación actual sigue abierta."\n      );\n    } finally {\n      if (currentSessionIdRef.current === sourceSessionId || currentSessionIdRef.current === sessionId) {\n        setIsStarting(false);\n      }\n    }\n  }, [assistants, loadAiraAvatarRuntime, selectedAssistantKey, sessionId]);'''

replace_once(old_assistant_block, new_assistant_block, "assistant effect and switch handler")

replace_once(
'''      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({\n        session_id: data.session_id,\n        chatbot_key: chatbotKey,\n      }));\n      setSessionId(data.session_id);''',
'''      sessionStorage.setItem(ASSISTANT_STORAGE_KEY, chatbotKey);\n      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({\n        session_id: data.session_id,\n        chatbot_key: chatbotKey,\n      }));\n      setSelectedAssistantKey(chatbotKey);\n      setSessionId(data.session_id);''',
"persist assistant on start",
)

replace_once(
'''      persistQuickReplies(data.session_id, initialQuickReplies);\n      setQuickRepliesOpen(false);''',
'''      persistQuickReplies(data.session_id, initialQuickReplies);\n      setQuickRepliesOpen(initialQuickReplies.length > 0);''',
"open initial quick replies",
)

path.write_text(text)
print("Patched PublicChatWidget.jsx for final AIRA/IVOX flow")
