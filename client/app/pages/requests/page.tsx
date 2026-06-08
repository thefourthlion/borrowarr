"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Button } from "@nextui-org/button";
import { Card, CardBody } from "@nextui-org/card";
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
import { PageContent, PageHeader } from "@/components/page-header";
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
    email?: string | null;
    avatarUrl?: string;
  };
  reviewedByUser?: {
    id: string;
    username: string;
    email?: string | null;
    avatarUrl?: string;
  };
}

const Requests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MediaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("pending");
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    denied: 0,
    total: 0,
  });

  // Modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<MediaRequest | null>(
    null,
  );
  const [reviewAction, setReviewAction] = useState<"approve" | "deny">(
    "approve",
  );
  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({ show: false, type: "success", message: "" });

  // Check if user can manage requests
  const canManageRequests =
    user?.permissions?.admin || user?.permissions?.manage_requests;

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(
      () => setNotification((prev) => ({ ...prev, show: false })),
      3000,
    );
  };

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");

      // Fetch requests based on user permissions
      const endpoint = canManageRequests
        ? "/api/MediaRequests/all"
        : "/api/MediaRequests/my";
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
      const response = await axios.get(
        `${API_BASE_URL}/api/MediaRequests/counts`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setCounts(
        response.data.counts || {
          pending: 0,
          approved: 0,
          denied: 0,
          total: 0,
        },
      );
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

  const openReviewModal = (
    request: MediaRequest,
    action: "approve" | "deny",
  ) => {
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
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showNotification(
        "success",
        `Request ${reviewAction === "approve" ? "approved" : "denied"} successfully`,
      );
      setShowReviewModal(false);
      fetchRequests();
      fetchCounts();
    } catch (error: any) {
      if (!error.response?.data?.error) {
        console.error("Error reviewing request:", error);
      }
      showNotification(
        "error",
        error.response?.data?.error || "Failed to review request",
      );
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
      showNotification(
        "error",
        error.response?.data?.error || "Failed to delete request",
      );
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Chip
            color="warning"
            size="sm"
            startContent={<Clock size={12} />}
            variant="flat"
          >
            Pending
          </Chip>
        );
      case "approved":
        return (
          <Chip
            color="success"
            size="sm"
            startContent={<CheckCircle2 size={12} />}
            variant="flat"
          >
            Approved
          </Chip>
        );
      case "denied":
        return (
          <Chip
            color="danger"
            size="sm"
            startContent={<XCircle size={12} />}
            variant="flat"
          >
            Denied
          </Chip>
        );
      case "downloading":
        return (
          <Chip
            color="primary"
            size="sm"
            startContent={<Spinner size="sm" />}
            variant="flat"
          >
            Downloading
          </Chip>
        );
      case "completed":
        return (
          <Chip
            color="success"
            size="sm"
            startContent={<CheckCircle2 size={12} />}
            variant="flat"
          >
            Completed
          </Chip>
        );
      default:
        return (
          <Chip size="sm" variant="flat">
            {status}
          </Chip>
        );
    }
  };

  const filteredRequests = requests.filter(
    (request) =>
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requestedBy?.username
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardBody className="text-center py-8">
            <AlertTriangle className="mx-auto mb-4 text-warning" size={48} />
            <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
            <p className="text-default-500">Please sign in to view requests.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        actions={
          counts.pending > 0 && canManageRequests ? (
            <Chip color="warning" size="lg" variant="shadow">
              {counts.pending} Pending
            </Chip>
          ) : null
        }
        description={
          canManageRequests
            ? "Review and manage media requests from users"
            : "View your media request history"
        }
        icon={<Inbox className="h-6 w-6" />}
        title={canManageRequests ? "Manage Requests" : "My Requests"}
      />

      {/* Content */}
      <PageContent>
        {/* Notification */}
        {notification.show && (
          <div
            className={`mb-6 p-4 rounded-lg border flex items-center gap-2 ${
              notification.type === "success"
                ? "bg-success/10 border-success/20 text-success"
                : "bg-danger/10 border-danger/20 text-danger"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <XCircle size={18} />
            )}
            {notification.message}
          </div>
        )}

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 border-b border-secondary/20 pb-4">
          <Button
            className="gap-2"
            color={selectedTab === "pending" ? "secondary" : "default"}
            onPress={() => setSelectedTab("pending")}
            size="sm"
            startContent={<Clock size={16} />}
            variant={selectedTab === "pending" ? "solid" : "flat"}
          >
            Pending
            {counts.pending > 0 && (
              <Chip className="ml-1" color="warning" size="sm" variant="flat">
                {counts.pending}
              </Chip>
            )}
          </Button>
          <Button
            color={selectedTab === "approved" ? "secondary" : "default"}
            onPress={() => setSelectedTab("approved")}
            size="sm"
            startContent={<CheckCircle2 size={16} />}
            variant={selectedTab === "approved" ? "solid" : "flat"}
          >
            Approved
          </Button>
          <Button
            color={selectedTab === "denied" ? "secondary" : "default"}
            onPress={() => setSelectedTab("denied")}
            size="sm"
            startContent={<XCircle size={16} />}
            variant={selectedTab === "denied" ? "solid" : "flat"}
          >
            Denied
          </Button>
          <Button
            color={selectedTab === "all" ? "secondary" : "default"}
            onPress={() => setSelectedTab("all")}
            size="sm"
            startContent={<Inbox size={16} />}
            variant={selectedTab === "all" ? "solid" : "flat"}
          >
            All
          </Button>
        </div>

        {/* Search */}
        <div className="my-6">
          <Input
            classNames={{
              inputWrapper:
                "bg-content2 border border-secondary/20 hover:border-secondary/40",
            }}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requests..."
            startContent={<Search className="text-default-400" size={18} />}
            value={searchQuery}
          />
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner color="secondary" size="lg" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="border border-secondary/20">
            <CardBody className="text-center py-16">
              <Inbox className="mx-auto mb-4 text-default-400" size={48} />
              <h3 className="text-lg font-semibold mb-2">No Requests Found</h3>
              <p className="text-default-500">
                {selectedTab === "pending"
                  ? "No pending requests to review"
                  : `No ${selectedTab} requests`}
              </p>
            </CardBody>
          </Card>
        ) : canManageRequests ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredRequests.map((request) => {
              const isPending = request.status === "pending";

              return (
                <div key={request.id} className="group">
                  <Card className="border border-secondary/20 bg-content1 overflow-hidden">
                    <CardBody className="p-0">
                      <div className="relative aspect-[2/3] w-full">
                        {request.posterPath ? (
                          <img
                            alt={request.title}
                            className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
                            src={`${TMDB_IMAGE_BASE}${request.posterPath}`}
                          />
                        ) : (
                          <div className="w-full h-full bg-content2 flex items-center justify-center">
                            {request.mediaType === "movie" ? (
                              <Film className="text-default-400" size={28} />
                            ) : (
                              <Tv className="text-default-400" size={28} />
                            )}
                          </div>
                        )}

                        <div className="absolute top-1 left-1 z-10">
                          {getStatusChip(request.status)}
                        </div>

                        <div className="absolute top-1 right-1 z-10">
                          <Chip
                            size="sm"
                            startContent={
                              request.mediaType === "movie" ? (
                                <Film size={12} />
                              ) : (
                                <Tv size={12} />
                              )
                            }
                            variant="flat"
                          >
                            {request.mediaType === "movie" ? "Movie" : "Series"}
                          </Chip>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2">
                          <h3 className="text-white text-sm font-semibold line-clamp-2">
                            {request.title}
                          </h3>
                          <p className="text-white/70 text-[11px] mt-1">
                            {request.releaseDate
                              ? new Date(request.releaseDate).getFullYear()
                              : "Unknown year"}
                          </p>
                          {request.requestedBy && (
                            <p className="text-white/70 text-[11px] line-clamp-1">
                              @{request.requestedBy.username}
                            </p>
                          )}

                          <div className="flex items-center gap-1 mt-2">
                            {isPending && (
                              <>
                                <Button
                                  isIconOnly
                                  color="success"
                                  onPress={() => openReviewModal(request, "approve")}
                                  size="sm"
                                  title="Approve"
                                  variant="flat"
                                >
                                  <CheckCircle2 size={14} />
                                </Button>
                                <Button
                                  isIconOnly
                                  color="danger"
                                  onPress={() => openReviewModal(request, "deny")}
                                  size="sm"
                                  title="Deny"
                                  variant="flat"
                                >
                                  <XCircle size={14} />
                                </Button>
                              </>
                            )}
                            <Button
                              isIconOnly
                              color="danger"
                              onPress={() => handleDelete(request.id)}
                              size="sm"
                              title="Delete request"
                              variant="flat"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Card
                className="border border-secondary/20 bg-content1 overflow-hidden"
                key={request.id}
              >
                <CardBody className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Poster */}
                    <div className="sm:w-32 sm:min-h-[180px] flex-shrink-0">
                      {request.posterPath ? (
                        <img
                          alt={request.title}
                          className="w-full h-full object-cover"
                          src={`${TMDB_IMAGE_BASE}${request.posterPath}`}
                        />
                      ) : (
                        <div className="w-full h-full min-h-[180px] bg-content2 flex items-center justify-center">
                          {request.mediaType === "movie" ? (
                            <Film className="text-default-400" size={32} />
                          ) : (
                            <Tv className="text-default-400" size={32} />
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
                              startContent={
                                request.mediaType === "movie" ? (
                                  <Film size={12} />
                                ) : (
                                  <Tv size={12} />
                                )
                              }
                              variant="flat"
                            >
                              {request.mediaType === "movie"
                                ? "Movie"
                                : "Series"}
                            </Chip>
                          </div>

                          <h3 className="text-lg font-semibold">
                            {request.title}
                          </h3>

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
                          {request.status === "pending" &&
                            canManageRequests && (
                              <div className="flex gap-2">
                                <Button
                                  color="success"
                                  onPress={() =>
                                    openReviewModal(request, "approve")
                                  }
                                  size="sm"
                                  startContent={<ThumbsUp size={14} />}
                                  variant="flat"
                                >
                                  Approve
                                </Button>
                                <Button
                                  color="danger"
                                  onPress={() =>
                                    openReviewModal(request, "deny")
                                  }
                                  size="sm"
                                  startContent={<ThumbsDown size={14} />}
                                  variant="flat"
                                >
                                  Deny
                                </Button>
                              </div>
                            )}

                          {(request.status === "pending" ||
                            canManageRequests) && (
                            <Button
                              color="danger"
                              onPress={() => handleDelete(request.id)}
                              size="sm"
                              startContent={<Trash2 size={14} />}
                              variant="light"
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
                            Requested by{" "}
                            <strong className="text-foreground">
                              {request.requestedBy.username}
                            </strong>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(
                            request.createdAt,
                          ).toLocaleDateString()} at{" "}
                          {new Date(request.createdAt).toLocaleTimeString()}
                        </span>
                        {request.reviewedByUser && (
                          <span className="flex items-center gap-1">
                            {request.status === "approved" ? (
                              <CheckCircle2
                                className="text-success"
                                size={12}
                              />
                            ) : (
                              <XCircle className="text-danger" size={12} />
                            )}
                            {request.status === "approved"
                              ? "Approved"
                              : "Denied"}{" "}
                            by{" "}
                            <strong className="text-foreground">
                              {request.reviewedByUser.username}
                            </strong>
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
      </PageContent>

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        size="lg"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            {reviewAction === "approve" ? (
              <CheckCircle2 className="text-success" size={24} />
            ) : (
              <XCircle className="text-danger" size={24} />
            )}
            {reviewAction === "approve" ? "Approve Request" : "Deny Request"}
          </ModalHeader>
          <ModalBody>
            {reviewingRequest && (
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  {reviewingRequest.posterPath && (
                    <img
                      alt={reviewingRequest.title}
                      className="w-20 h-30 object-cover rounded-lg"
                      src={`${TMDB_IMAGE_BASE}${reviewingRequest.posterPath}`}
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">
                      {reviewingRequest.title}
                    </h3>
                    <p className="text-sm text-default-500">
                      {reviewingRequest.mediaType === "movie"
                        ? "Movie"
                        : "Series"}
                      {reviewingRequest.releaseDate &&
                        ` • ${new Date(reviewingRequest.releaseDate).getFullYear()}`}
                    </p>
                    <p className="text-sm text-default-400 mt-1">
                      Requested by: {reviewingRequest.requestedBy?.username}
                    </p>
                  </div>
                </div>

                <Textarea
                  label="Review Note (Optional)"
                  minRows={3}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={
                    reviewAction === "approve"
                      ? "Add a note for the user..."
                      : "Explain why this request was denied..."
                  }
                  value={reviewNote}
                />

                <p className="text-sm text-default-500">
                  {reviewAction === "approve"
                    ? "This will approve the request and add it to the user's monitored content."
                    : "This will deny the request. The user will be notified."}
                </p>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onPress={() => setShowReviewModal(false)} variant="flat">
              Cancel
            </Button>
            <Button
              color={reviewAction === "approve" ? "success" : "danger"}
              isLoading={submitting}
              onPress={handleReview}
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
