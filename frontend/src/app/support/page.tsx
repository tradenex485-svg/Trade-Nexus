'use client';

import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supportApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { Ticket, MessageSquare, Bell, Plus, Send, Mail, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function SupportPage() {
  const { token } = useAuthStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'medium',
  });

  const loadData = useCallback(async () => {
    // Wait for token before loading data
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [ticketsResponse, newslettersResponse] = await Promise.all([
        supportApi.getTickets(),
        supportApi.getNewsletters(),
      ]);
      setTickets(ticketsResponse.data || []);
      setNewsletters(newslettersResponse.data || []);
    } catch (error) {
      console.error('Failed to load support data:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadTicketMessages = async (ticketId: number) => {
    try {
      const response = await supportApi.getTicketMessages(ticketId);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleCreateTicket = async () => {
    try {
      await supportApi.createTicket(newTicket);
      setShowNewTicketModal(false);
      setNewTicket({ subject: '', description: '', category: 'general', priority: 'medium' });
      loadData();
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      await supportApi.addTicketMessage(selectedTicket.id, newMessage);
      setNewMessage('');
      loadTicketMessages(selectedTicket.id);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: 'bg-green-500',
      'in-progress': 'bg-blue-500',
      resolved: 'bg-purple-500',
      closed: 'bg-gray-500',
    };
    return (
      <Badge className={`${variants[status] || 'bg-gray-500'} text-white`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      low: 'bg-gray-500',
      medium: 'bg-blue-500',
      high: 'bg-orange-500',
      critical: 'bg-red-500',
    };
    return (
      <Badge className={`${variants[priority] || 'bg-gray-500'} text-white`}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Support Center</h1>
              <p className="text-slate-400">Manage support tickets and view announcements</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadData}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={() => setShowNewTicketModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total Tickets</p>
                    <p className="text-2xl font-bold text-white">{tickets.length}</p>
                  </div>
                  <Ticket className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Open Tickets</p>
                    <p className="text-2xl font-bold text-white">
                      {tickets.filter((t) => t.status === 'open').length}
                    </p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Resolved</p>
                    <p className="text-2xl font-bold text-white">
                      {tickets.filter((t) => t.status === 'resolved').length}
                    </p>
                  </div>
                  <Bell className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Newsletters</p>
                    <p className="text-2xl font-bold text-white">{newsletters.length}</p>
                  </div>
                  <Mail className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="tickets" className="space-y-4">
            <TabsList className="bg-slate-800 border border-slate-700">
              <TabsTrigger value="tickets" className="data-[state=active]:bg-slate-700">
                Support Tickets
              </TabsTrigger>
              <TabsTrigger value="newsletters" className="data-[state=active]:bg-slate-700">
                Newsletters & Announcements
              </TabsTrigger>
            </TabsList>

            {/* Tickets Tab */}
            <TabsContent value="tickets">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tickets List */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Your Tickets</CardTitle>
                    <CardDescription className="text-slate-400">
                      {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-12 text-slate-400">Loading tickets...</div>
                    ) : tickets.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        No tickets found. Create your first support ticket.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {tickets.map((ticket) => (
                          <motion.div
                            key={ticket.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => {
                              setSelectedTicket(ticket);
                              loadTicketMessages(ticket.id);
                            }}
                            className={`p-4 rounded-lg border cursor-pointer transition-all ${
                              selectedTicket?.id === ticket.id
                                ? 'bg-slate-700 border-blue-500'
                                : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-white font-medium">{ticket.subject}</h4>
                              {getStatusBadge(ticket.status)}
                            </div>
                            <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                              {ticket.description}
                            </p>
                            <div className="flex items-center gap-3 text-sm">
                              {getPriorityBadge(ticket.priority)}
                              <span className="text-slate-400">
                                {new Date(ticket.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Ticket Messages */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">
                      {selectedTicket ? selectedTicket.subject : 'Select a ticket'}
                    </CardTitle>
                    {selectedTicket && (
                      <CardDescription className="text-slate-400">
                        Ticket #{selectedTicket.ticket_number}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {selectedTicket ? (
                      <div className="flex flex-col h-[600px]">
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`p-3 rounded-lg ${
                                msg.is_internal ? 'bg-yellow-900/20' : 'bg-slate-900'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-medium">{msg.sender_name}</span>
                                <span className="text-slate-400 text-xs">
                                  {new Date(msg.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-slate-300 text-sm">{msg.message}</p>
                            </div>
                          ))}
                        </div>

                        {/* Message Input */}
                        <div className="border-t border-slate-700 pt-4">
                          <div className="flex gap-2">
                            <Input
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Type your message..."
                              className="flex-1 bg-slate-900 border-slate-700 text-white"
                              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700">
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[600px] text-slate-400">
                        Select a ticket to view messages
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Newsletters Tab */}
            <TabsContent value="newsletters">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Newsletters & Announcements</CardTitle>
                  <CardDescription className="text-slate-400">
                    Latest updates and announcements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-12 text-slate-400">Loading newsletters...</div>
                  ) : newsletters.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No newsletters available.</div>
                  ) : (
                    <div className="space-y-4">
                      {newsletters.map((newsletter) => (
                        <motion.div
                          key={newsletter.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-6 bg-slate-900 border border-slate-700 rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-xl font-semibold text-white mb-1">
                                {newsletter.title}
                              </h3>
                              <p className="text-slate-400 text-sm">
                                {new Date(newsletter.published_at).toLocaleDateString()}
                              </p>
                            </div>
                            {newsletter.category && (
                              <Badge className="bg-blue-500 text-white">{newsletter.category}</Badge>
                            )}
                          </div>
                          <div
                            className="text-slate-300 prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: newsletter.content }}
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* New Ticket Modal (simplified - would use a proper modal component) */}
          {showNewTicketModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="bg-slate-800 border-slate-700 w-full max-w-2xl">
                <CardHeader>
                  <CardTitle className="text-white">Create New Ticket</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Subject</Label>
                    <Input
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Description</Label>
                    <textarea
                      value={newTicket.description}
                      onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Category</Label>
                      <select
                        value={newTicket.category}
                        onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                      >
                        <option value="general">General</option>
                        <option value="technical">Technical</option>
                        <option value="billing">Billing</option>
                        <option value="compliance">Compliance</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Priority</Label>
                      <select
                        value={newTicket.priority}
                        onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowNewTicketModal(false)}
                      className="border-slate-600 text-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTicket} className="bg-blue-600 hover:bg-blue-700">
                      Create Ticket
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
