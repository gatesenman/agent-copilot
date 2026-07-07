package com.odagent.copilot.tools;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * US-011 ReAct 执行层的后端工具注册表（通用协作域，非业务绑定）。
 * 每个工具 = OpenAI function schema + 执行函数。
 * 前端 Action（frontendActions）由 ReactAgentEngine 单独合并，不在此注册。
 */
@Component
public class ToolRegistry {

  public record Tool(
      String name,
      String description,
      Map<String, Object> parameters,
      boolean requiresApproval,
      Function<Map<String, Object>, Map<String, Object>> executor
  ) {}

  private final Map<String, Tool> tools = new LinkedHashMap<>();
  private final DemoDataStore db;

  public ToolRegistry(DemoDataStore db) {
    this.db = db;
    register();
  }

  public Tool get(String name) { return tools.get(name); }
  public boolean has(String name) { return tools.containsKey(name); }

  /** 转为 OpenAI tools 数组 */
  public List<Map<String, Object>> toOpenAiTools() {
    return tools.values().stream().map(t -> Map.<String, Object>of(
        "type", "function",
        "function", Map.of(
            "name", t.name(),
            "description", t.description(),
            "parameters", t.parameters()
        )
    )).collect(Collectors.toList());
  }

  private Map<String, Object> schema(Map<String, Object> props, List<String> required) {
    Map<String, Object> s = new HashMap<>();
    s.put("type", "object");
    s.put("properties", props);
    s.put("required", required);
    return s;
  }

  private void register() {
    tools.put("searchWorkItems", new Tool(
        "searchWorkItems",
        "查询工作项。可按状态（approved/pending_approval）、类别过滤。",
        schema(Map.of(
            "status", Map.of("type", "string", "description", "状态过滤，可选"),
            "category", Map.of("type", "string", "description", "类别过滤，可选")
        ), List.of()),
        false,
        args -> {
          String status = (String) args.get("status");
          String category = (String) args.get("category");
          var list = db.workItems.stream()
              .filter(r -> status == null || r.status().equals(status))
              .filter(r -> category == null || r.category().contains(category))
              .toList();
          return Map.of("count", list.size(), "workItems", list);
        }
    ));

    tools.put("searchMembers", new Tool(
        "searchMembers",
        "查询团队成员。可按部门、是否可用过滤。",
        schema(Map.of(
            "department", Map.of("type", "string", "description", "部门，可选"),
            "availableOnly", Map.of("type", "boolean", "description", "只返回可用成员")
        ), List.of()),
        false,
        args -> {
          String department = (String) args.get("department");
          boolean availableOnly = Boolean.TRUE.equals(args.get("availableOnly"));
          var list = db.members.stream()
              .filter(m -> department == null || m.department().contains(department))
              .filter(m -> !availableOnly || m.available())
              .toList();
          return Map.of("count", list.size(), "members", list);
        }
    ));

    tools.put("createApprovalFlow", new Tool(
        "createApprovalFlow",
        "为工作项创建审批流。高风险操作，需要人工审批。",
        schema(Map.of(
            "workItemId", Map.of("type", "string", "description", "工作项编号"),
            "approverIds", Map.of("type", "array", "items", Map.of("type", "string"),
                "description", "审批人 ID 列表"),
            "deadline", Map.of("type", "string", "description", "审批截止日期 YYYY-MM-DD")
        ), List.of("workItemId", "approverIds", "deadline")),
        true,
        args -> {
          String wid = (String) args.get("workItemId");
          @SuppressWarnings("unchecked")
          List<String> aids = (List<String>) args.getOrDefault("approverIds", List.of());
          String id = db.nextFlowId();
          var flow = new DemoDataStore.ApprovalFlow(id, wid, aids,
              (String) args.get("deadline"), "published");
          db.approvalFlows.add(flow);
          // 模拟候选人自动提交评估（投入成本 + 交付周期）
          List<DemoDataStore.Assessment> newAssessments = new ArrayList<>();
          double base = db.workItems.stream()
              .filter(r -> r.id().equals(wid)).findFirst()
              .map(DemoDataStore.WorkItem::amount).orElse(100_000.0);
          int i = 0;
          for (String aid : aids) {
            i++;
            var a = new DemoDataStore.Assessment(
                "AT-" + id + "-" + i, id, aid,
                Math.round(base * (0.82 + 0.06 * i)), 15 + 5 * i, "2026-08-31");
            db.assessments.add(a);
            newAssessments.add(a);
          }
          return Map.of("flow", flow, "autoAssessments", newAssessments);
        }
    ));

    tools.put("compareAssessments", new Tool(
        "compareAssessments",
        "对某审批流的全部候选评估进行对比分析，返回推荐人选。",
        schema(Map.of(
            "flowId", Map.of("type", "string", "description", "审批流编号")
        ), List.of("flowId")),
        false,
        args -> {
          String flowId = (String) args.get("flowId");
          var as = db.assessments.stream().filter(a -> a.flowId().equals(flowId)).toList();
          if (as.isEmpty()) return Map.of("error", "该审批流暂无候选评估");
          var best = as.stream()
              .min((a, b) -> Double.compare(
                  a.cost() + a.leadTimeDays() * 1000,
                  b.cost() + b.leadTimeDays() * 1000))
              .orElseThrow();
          return Map.of("assessments", as, "recommended", best,
              "criteria", "综合最低成本与周期加权");
        }
    ));

    tools.put("createAssignment", new Tool(
        "createAssignment",
        "根据评估对比结果创建执行指派。高风险操作，需要人工审批。",
        schema(Map.of(
            "workItemId", Map.of("type", "string"),
            "memberId", Map.of("type", "string"),
            "amount", Map.of("type", "number")
        ), List.of("workItemId", "memberId", "amount")),
        true,
        args -> {
          var assignment = new DemoDataStore.Assignment(
              db.nextAssignmentId(),
              (String) args.get("workItemId"),
              (String) args.get("memberId"),
              ((Number) args.get("amount")).doubleValue(),
              "pending_confirm");
          db.assignments.add(assignment);
          return Map.of("assignment", assignment);
        }
    ));

    tools.put("getOntologySchema", new Tool(
        "getOntologySchema",
        "获取协作领域本体（实体与关系定义），用于推理上下文。",
        schema(Map.of(), List.of()),
        false,
        args -> db.ontologySchema
    ));
  }
}
