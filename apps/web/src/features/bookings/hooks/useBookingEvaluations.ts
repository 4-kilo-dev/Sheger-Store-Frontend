import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listPerformanceMetricsApi,
  getInternalEvaluationApi,
  submitInternalEvaluationApi,
  getClientEvaluationApi,
  submitClientEvaluationApi,
  type SubmitInternalEvaluationPayload,
  type SubmitClientEvaluationPayload,
} from "@/features/bookings/services/evaluations.api";
import { transitionBookingStatusApi, type Booking } from "@/features/bookings/services/bookings.api";

export function useBookingEvaluations(code: string, booking: Booking | undefined, userRole?: string) {
  const queryClient = useQueryClient();

  const isAllowedToEvaluate = !!userRole && ["admin", "supervisor", "chief_tech", "cto"].includes(userRole);

  // Internal Evaluation Modal states
  const [showInternalModal, setShowInternalModal] = useState(false);
  const [venueName, setVenueName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [teamSize, setTeamSize] = useState(0);
  const [notes, setNotes] = useState("");
  const [internalScores, setInternalScores] = useState<Record<string, number>>({});

  // Client Webhook Modal states
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [respondentName, setRespondentName] = useState("");
  const [clientScores, setClientScores] = useState<Record<string, number>>({});

  // Queries
  const { data: metrics } = useQuery({
    queryKey: ["active-metrics"],
    queryFn: () => listPerformanceMetricsApi({ isActive: true }),
    enabled: isAllowedToEvaluate,
  });
  
  const { data: internalEval, isLoading: loadingInternal } = useQuery({
    queryKey: ["booking-internal-eval", booking?.id || code],
    queryFn: () => getInternalEvaluationApi(booking?.id || code),
    retry: false,
    enabled: !!(booking?.id || code) && isAllowedToEvaluate,
  });

  const { data: clientEval, isLoading: loadingClient } = useQuery({
    queryKey: ["booking-client-eval", booking?.id || code],
    queryFn: () => getClientEvaluationApi(booking?.id || code),
    retry: false,
    enabled: !!(booking?.id || code) && isAllowedToEvaluate,
  });

  const internalMetrics = metrics?.filter((m) => m.category === "internal") || [];
  const clientMetrics = metrics?.filter((m) => m.category === "client_feedback") || [];

  const { mutate: submitInternal, isPending: submittingInternal } = useMutation({
    mutationFn: async (payload: SubmitInternalEvaluationPayload) => {
      const res = await submitInternalEvaluationApi(booking?.id || code, payload);
      await transitionBookingStatusApi(code, "COMPLETED");
      return res;
    },
    onSuccess: () => {
      toast.success("Internal crew evaluation submitted!");
      queryClient.invalidateQueries({ queryKey: ["booking-internal-eval", booking?.id || code] });
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setShowInternalModal(false);
      setInternalScores({});
      setNotes("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit crew evaluation");
    },
  });

  const { mutate: simulateWebhook, isPending: submittingWebhook } = useMutation({
    mutationFn: (payload: SubmitClientEvaluationPayload) => submitClientEvaluationApi(booking?.id || code, payload),
    onSuccess: () => {
      toast.success("Client feedback simulated via webhook!");
      queryClient.invalidateQueries({ queryKey: ["booking-client-eval", booking?.id || code] });
      setShowWebhookModal(false);
      setRespondentName("");
      setClientScores({});
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to simulate client feedback");
    },
  });

  const openInternalForm = () => {
    if (!booking) return;
    const initialScores: Record<string, number> = {};
    internalMetrics.forEach((m) => {
      initialScores[m.id] = m.valueType === "boolean" ? 1 
                          : m.valueType === "rating_5" ? 5 
                          : m.valueType === "percentage" ? 100 
                          : 10;
    });
    setInternalScores(initialScores);
    setVenueName(booking.venue);
    setEventDate(booking.eventDate);
    setTeamSize((booking.assignees?.length || 0) + 2);
    setNotes("");
    setShowInternalModal(true);
  };

  const openClientForm = () => {
    const initialScores: Record<string, number> = {};
    clientMetrics.forEach((m) => {
      initialScores[m.key] = m.valueType === "boolean" ? 1 
                           : m.valueType === "rating_5" ? 5 
                           : m.valueType === "percentage" ? 100 
                           : 10;
    });
    setClientScores(initialScores);
    setRespondentName("");
    setShowWebhookModal(true);
  };

  return {
    showInternalModal,
    setShowInternalModal,
    venueName,
    setVenueName,
    eventDate,
    setEventDate,
    teamSize,
    setTeamSize,
    notes,
    setNotes,
    internalScores,
    setInternalScores,
    showWebhookModal,
    setShowWebhookModal,
    respondentName,
    setRespondentName,
    clientScores,
    setClientScores,
    internalMetrics,
    clientMetrics,
    internalEval,
    loadingInternal,
    clientEval,
    loadingClient,
    submitInternal,
    submittingInternal,
    simulateWebhook,
    submittingWebhook,
    openInternalForm,
    openClientForm,
  };
}
