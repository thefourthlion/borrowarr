"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Button } from "@nextui-org/button";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Input } from "@nextui-org/input";
import { Spinner } from "@nextui-org/spinner";
import { Chip } from "@nextui-org/chip";
import { Textarea } from "@nextui-org/input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@nextui-org/modal";
import {
  Inbox,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Film,
  Tv,
  User,
  Calendar,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import "../../../styles/Requests.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w300";

interface MediaRequest {
  id: string;
  userId: string;
  mediaType: "movie" | "series";
  tmdbId: number;
  title: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  selectedSeasons?: number[];
  selectedEpisodes?: string[];
  qualityProfile?: string;
  status: "pending" | "approved" | "denied" | "downloading" | "completed";
  requestNote?: string;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  requestedBy?: {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
  };
  reviewedByUser?: {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
  };
}

const Requests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MediaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("pending");
  const [counts, setCounts] = useState({ pending: 0, approved: 0, denied: 0, total: 0 });
  
  // Modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<MediaRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "deny">("approve");
  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({ show: false, type: "success", message: "" });

  // Check if user can manage requests
  const canManageRequests = user?.permissions?.admin || user?.permissions?.manage_requests;

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
  };

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      
      // Fetch requests based on user permissions
      const endpoint = canManageRequests ? "/api/MediaRequests/all" : "/api/MediaRequests/my";
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: selectedTab === "all" ? undefined : selectedTab },
      });
      
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      showNotification("error", "Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  }, [canManageRequests, selectedTab]);

  const fetchCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${API_BASE_URL}/api/MediaRequests/counts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCounts(response.data.counts || { pending: 0, approved: 0, denied: 0, total: 0 });
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchCounts();
    }
  }, [user, fetchRequests, fetchCounts]);

  const openReviewModal = (request: MediaRequest, action: "approve" | "deny") => {
    setReviewingRequest(request);
    setReviewAction(action);
    setReviewNote("");
    setShowReviewModal(true);
  };

  const handleReview = async () => {
    if (!reviewingRequest) return;
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem("accessToken");
      
      await axios.post(
        `${API_BASE_URL}/api/MediaRequests/${reviewingRequest.id}/${reviewAction}`,
        { reviewNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showNotification("success", `Request ${reviewAction === "approve" ? "approved" : "denied"} successfully`);
      setShowReviewModal(false);
      fetchRequests();
      fetchCounts();
    } catch (error: any) {
      console.error("Error reviewing request:", error);
      showNotification("error", error.response?.data?.error || "Failed to review request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    
    try {
      const token = localStorage.getItem("accessToken");
      await axios.delete(`${API_BASE_URL}/api/MediaRequests/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showNotification("success", "Request deleted");
      fetchRequests();
      fetchCounts();
    } catch (error: any) {
      console.error("Error deleting request:", error);
      showNotification("error", error.response?.data?.error || "Failed to delete request");
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case "pending":
        return <Chip size="sm" color="warning" variant="flat" startContent={<Clock size={12} />}>Pending</Chip>;
      case "approved":
        return <Chip size="sm" color="success" variant="flat" startContent={<CheckCircle2 size={12} />}>Approved</Chip>;
      case "denied":
        return <Chip size="sm" color="danger" variant="flat" startContent={<XCircle size={12} />}>Denied</Chip>;
      case "downloading":
        return <Chip size="sm" color="primary" variant="flat" startContent={<Spinner size="sm" />}>Downloading</Chip>;
      case "completed":
        return <Chip size="sm" color="success" variant="flat" startContent={<CheckCircle2 size={12} />}>Completed</Chip>;
      default:
        return <Chip size="sm" variant="flat">{status}</Chip>;
    }
  };

  const filteredRequests = requests.filter(request =>
    request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.requestedBy?.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardBody className="text-center py-8">
            <AlertTriangle size={48} className="mx-auto mb-4 text-warning" />
            <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
            <p className="text-default-500">Please sign in to view requests.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-secondary/10">
                <Inbox className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent">
                  {canManageRequests ? "Manage Requests" : "My Requests"}
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                  {canManageRequests 
                    ? "Review and manage media requests from users"
                    : "View your media request history"
                  }
                </p>
              </div>
            </div>
            {counts.pending > 0 && canManageRequests && (
              <Chip color="warning" variant="shadow" size="lg">
                {counts.pending} Pending
              </Chip>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Notification */}
        {notification.show && (
          <div
            className={`mb-6 p-4 rounded-lg border flex items-center gap-2 ${
              notification.type === "success"
                ? "bg-success/10 border-success/20 text-success"
                : "bg-danger/10 border-danger/20 text-danger"
            }`}
          >
            {notification.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {notification.message}
          </div>
        )}

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 border-b border-secondary/20 pb-4">
          <Button
            variant={selectedTab === "pending" ? "solid" : "flat"}
            color={selectedTab === "pending" ? "secondary" : "default"}
            size="sm"
            startContent={<Clock size={16} />}
            onPress={() => setSelectedTab("pending")}
            className="gap-2"
          >
            Pending
            {counts.pending > 0 && (
              <Chip size="sm" color="warning" variant="flat" className="ml-1">{counts.pending}</Chip>
            )}
          </Button>
          <Button
            variant={selectedTab === "approved" ? "solid" : "flat"}
            color={selectedTab === "approved" ? "secondary" : "default"}
            size="sm"
            startContent={<CheckCircle2 size={16} />}
            onPress={() => setSelectedTab("approved")}
          >
            Approved
          </Button>
          <Button
            variant={selectedTab === "denied" ? "solid" : "flat"}
            color={selectedTab === "denied" ? "secondary" : "default"}
            size="sm"
            startContent={<XCircle size={16} />}
            onPress={() => setSelectedTab("denied")}
          >
            Denied
          </Button>
          <Button
            variant={selectedTab === "all" ? "solid" : "flat"}
            color={selectedTab === "all" ? "secondary" : "default"}
            size="sm"
            startContent={<Inbox size={16} />}
            onPress={() => setSelectedTab("all")}
          >
            All
          </Button>
        </div>

        {/* Search */}
        <div className="my-6">
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Search size={18} className="text-default-400" />}
            classNames={{
              inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
            }}
          />
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" color="secondary" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="border border-secondary/20">
            <CardBody className="text-center py-16">
              <Inbox size={48} className="mx-auto mb-4 text-default-400" />
              <h3 className="text-lg font-semibold mb-2">No Requests Found</h3>
              <p className="text-default-500">
                {selectedTab === "pending" 
                  ? "No pending requests to review"
                  : `No ${selectedTab} requests`
                }
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Card
                key={request.id}
                className="border border-secondary/20 bg-content1 overflow-hidden"
              >
                <CardBody className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Poster */}
                    <div className="sm:w-32 sm:min-h-[180px] flex-shrink-0">
                      {request.posterPath ? (
                        <img
                          src={`${TMDB_IMAGE_BASE}${request.posterPath}`}
                          alt={request.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full min-h-[180px] bg-content2 flex items-center justify-center">
                          {request.mediaType === "movie" ? (
                            <Film size={32} className="text-default-400" />
                          ) : (
                            <Tv size={32} className="text-default-400" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            {getStatusChip(request.status)}
                            <Chip 
                              size="sm" 
                              variant="flat"
                              startContent={request.mediaType === "movie" ? <Film size={12} /> : <Tv size={12} />}
                            >
                              {request.mediaType === "movie" ? "Movie" : "Series"}
                            </Chip>
                          </div>
                          
                          <h3 className="text-lg font-semibold">{request.title}</h3>
                          
                          {request.releaseDate && (
                            <p className="text-sm text-default-500 flex items-center gap-1 mt-1">
                              <Calendar size={14} />
                              {new Date(request.releaseDate).getFullYear()}
                            </p>
                          )}

                          {request.overview && (
                            <p className="text-sm text-default-500 mt-2 line-clamp-2">
                              {request.overview}
                            </p>
                          )}

                          {/* Request Note */}
                          {request.requestNote && (
                            <div className="mt-3 p-2 bg-content2 rounded-lg">
                              <p className="text-xs text-default-400 flex items-center gap-1 mb-1">
                                <MessageSquare size={12} />
                                Request Note
                              </p>
                              <p className="text-sm">{request.requestNote}</p>
                            </div>
                          )}

                          {/* Review Note */}
                          {request.reviewNote && (
                            <div className="mt-3 p-2 bg-content2 rounded-lg">
                              <p className="text-xs text-default-400 flex items-center gap-1 mb-1">
                                <MessageSquare size={12} />
                                Review Note
                              </p>
                              <p className="text-sm">{request.reviewNote}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 sm:items-end">
                          {request.status === "pending" && canManageRequests && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                color="success"
                                variant="flat"
                                startContent={<ThumbsUp size={14} />}
                                onPress={() => openReviewModal(request, "approve")}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                color="danger"
                                variant="flat"
                                startContent={<ThumbsDown size={14} />}
                                onPress={() => openReviewModal(request, "deny")}
                              >
                                Deny
                              </Button>
                            </div>
                          )}
                          
                          {(request.status === "pending" || canManageRequests) && (
                            <Button
                              size="sm"
                              variant="light"
                              color="danger"
                              startContent={<Trash2 size={14} />}
                              onPress={() => handleDelete(request.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-secondary/10 text-xs text-default-400">
                        {request.requestedBy && (
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            Requested by <strong className="text-foreground">{request.requestedBy.username}</strong>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString()}
                        </span>
                        {request.reviewedByUser && (
                          <span className="flex items-center gap-1">
                            {request.status === "approved" ? <CheckCircle2 size={12} className="text-success" /> : <XCircle size={12} className="text-danger" />}
                            {request.status === "approved" ? "Approved" : "Denied"} by <strong className="text-foreground">{request.reviewedByUser.username}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Modal 
        isOpen={showReviewModal} 
        onClose={() => setShowReviewModal(false)}
        size="lg"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            {reviewAction === "approve" ? (
              <CheckCircle2 size={24} className="text-success" />
            ) : (
              <XCircle size={24} className="text-danger" />
            )}
            {reviewAction === "approve" ? "Approve Request" : "Deny Request"}
          </ModalHeader>
          <ModalBody>
            {reviewingRequest && (
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  {reviewingRequest.posterPath && (
                    <img
                      src={`${TMDB_IMAGE_BASE}${reviewingRequest.posterPath}`}
                      alt={reviewingRequest.title}
                      className="w-20 h-30 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{reviewingRequest.title}</h3>
                    <p className="text-sm text-default-500">
                      {reviewingRequest.mediaType === "movie" ? "Movie" : "Series"}
                      {reviewingRequest.releaseDate && ` • ${new Date(reviewingRequest.releaseDate).getFullYear()}`}
                    </p>
                    <p className="text-sm text-default-400 mt-1">
                      Requested by: {reviewingRequest.requestedBy?.username}
                    </p>
                  </div>
                </div>

                <Textarea
                  label="Review Note (Optional)"
                  placeholder={reviewAction === "approve" 
                    ? "Add a note for the user..."
                    : "Explain why this request was denied..."
                  }
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  minRows={3}
                />

                <p className="text-sm text-default-500">
                  {reviewAction === "approve"
                    ? "This will approve the request and add it to the user's monitored content."
                    : "This will deny the request. The user will be notified."
                  }
                </p>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setShowReviewModal(false)}>
              Cancel
            </Button>
            <Button
              color={reviewAction === "approve" ? "success" : "danger"}
              onPress={handleReview}
              isLoading={submitting}
            >
              {reviewAction === "approve" ? "Approve" : "Deny"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default Requests;
