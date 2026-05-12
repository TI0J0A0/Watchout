import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { fetchTopics, deleteTopic, fetchFeedback, updateFeedback } from '../services/community'

export function AdminPage() {
    const { T, dark } = useTheme();
    const [tab, setTab] = useState('topics');
    const [topics, setTopics] = useState([]);
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true)
        if (tab === 'topics') {
            fetchTopics().then(setTopics).finally(() => setLoading(false))
        } else {
            fetchFeedback().then(setFeedbacks).finally(() => setLoading(false))
        }
    }, [tab])

    async function handleDeleteTopic(id) {
        if (!confirm(T('Are you sure you want to delete this topic?'))) return;
        await deleteTopic(id);
        setTopics(prev => prev.filter(t => t.id !== id));
    }

    async function handleStatusChange(id, status) {
        await updateFeedback(id, status);
        setFeedback(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    }

    return (
        <div style={{ padding: '32px 0 60px', maxWidth: 900, margin: '0 auto' }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: T.txt, marginBottom: 16 }}>
                Painel de Administração
            </h1>

            {/* Abas */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: `1px solid ${T.bord}` }}>
                <button onClick={() => setTab('topics')} style={{
                    padding: '10px 20px', background: tab === 'topics' ? T.surf : 'transparent',
                    border: 'none', borderBottom: tab === 'topics' ? '2px solid #0A84FF' : 'none',
                    color: tab === 'topics' ? T.txt : T.sub, fontWeight: 600, cursor: 'pointer'
                }}>Moderar Fórum</button>
                <button onClick={() => setTab('feedbacks')} style={{
                    padding: '10px 20px', background: tab === 'feedbacks' ? T.surf : 'transparent',
                    border: 'none', borderBottom: tab === 'feedbacks' ? '2px solid #0A84FF' : 'none',
                    color: tab === 'feedbacks' ? T.txt : T.sub, fontWeight: 600, cursor: 'pointer'
                }}>Gerenciar Feedbacks</button>
            </div>

            {loading ? <p style={{ color: T.sub }}>Carregando dados...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {tab === 'topics' && topics.map(topic => (
                        <div key={topic.id} style={{
                            padding: 16, borderRadius: 12, background: T.surf, border: `1px solid ${T.bord}`,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <p style={{ fontWeight: 600, color: T.txt }}>{topic.title}</p>
                                <p style={{ fontSize: 12, color: T.sub }}>
                                    Autor: {topic.profiles?.display_name || topic.profiles?.username || 'Anônimo'} · Respostas: {topic.reply_count}
                                </p>
                            </div>
                            <button onClick={() => handleDeleteTopic(topic.id)} style={{
                                padding: '6px 12px', background: '#FF3B3022', color: '#FF3B30',
                                border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer'
                            }}>Deletar</button>
                        </div>
                    ))}

                    {tab === 'feedbacks' && feedbacks.map(item => (
                        <div key={item.id} style={{
                            padding: 16, borderRadius: 12, background: T.surf, border: `1px solid ${T.bord}`,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <span style={{ fontSize: 10, background: '#0A84FF22', color: '#0A84FF', padding: '2px 6px', borderRadius: 4 }}>
                                    {item.type.toUpperCase()}
                                </span>
                                <p style={{ fontWeight: 600, color: T.txt, marginTop: 4 }}>{item.title}</p>
                                <p style={{ fontSize: 13, color: T.sub }}>{item.description}</p>
                                <p style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>Votos: {item.votes}</p>
                            </div>
                            <select
                                value={item.status}
                                onChange={e => handleStatusChange(item.id, e.target.value)}
                                style={{ padding: '6px 10px', borderRadius: 8, background: T.surf, color: T.txt, border: `1px solid ${T.bord}` }}
                            >
                                <option value="open">Aberto</option>
                                <option value="reviewing">Em Análise</option>
                                <option value="done">Resolvido</option>
                            </select>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
