package com.odagent.copilot.tools;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 内置通用协作域模拟数据（与前端 BrowserAgentRuntime 的 mock 数据对齐）。
 * 工作项 / 团队成员 / 审批流 / 指派 —— 非业务绑定，生产环境替换为真实数据库接口。
 */
@Component
public class DemoDataStore {

  public record WorkItem(String id, String title, String category, String status,
                         double amount, String department, String requester, String dueDate) {}

  public record Member(String id, String name, String role, String department,
                       double rating, boolean available) {}

  public record ApprovalFlow(String id, String workItemId, List<String> approverIds,
                             String deadline, String status) {}

  public record Assessment(String id, String flowId, String memberId, double cost,
                           int leadTimeDays, String validUntil) {}

  public record Assignment(String id, String workItemId, String memberId,
                           double amount, String status) {}

  public final List<WorkItem> workItems = new ArrayList<>(List.of(
      new WorkItem("WI-2024-001", "核心系统性能优化专项", "技术专项", "approved",
          1_200_000, "研发中心", "王强", "2026-08-15"),
      new WorkItem("WI-2024-002", "办公协作平台升级", "IT 项目", "approved",
          360_000, "信息技术部", "李娜", "2026-07-30"),
      new WorkItem("WI-2024-003", "数据合规审计整改", "合规专项", "pending_approval",
          85_000, "法务部", "赵敏", "2026-09-01"),
      new WorkItem("WI-2024-012", "灾备演练与预案更新", "运维专项", "approved",
          150_000, "运维部", "陈平", "2026-07-25")
  ));

  public final List<Member> members = new ArrayList<>(List.of(
      new Member("MB-001", "张海峰", "架构师", "研发中心", 4.8, true),
      new Member("MB-002", "刘晓东", "高级工程师", "研发中心", 4.6, true),
      new Member("MB-003", "周凯", "工程师", "研发中心", 4.2, true),
      new Member("MB-004", "孙婷", "项目经理", "信息技术部", 4.7, true),
      new Member("MB-005", "吴磊", "运维专家", "运维部", 4.5, true),
      new Member("MB-006", "郑洁", "合规顾问", "法务部", 4.9, true),
      new Member("MB-007", "试用期成员", "实习生", "研发中心", 3.1, false)
  ));

  public final List<ApprovalFlow> approvalFlows = new ArrayList<>();
  public final List<Assessment> assessments = new ArrayList<>();
  public final List<Assignment> assignments = new ArrayList<>();

  public final Map<String, Object> ontologySchema = new ConcurrentHashMap<>(Map.of(
      "entities", List.of("WorkItem", "Member", "ApprovalFlow", "Assessment", "Assignment"),
      "relations", List.of(
          "ApprovalFlow --belongsTo--> WorkItem",
          "ApprovalFlow --involves--> Member",
          "Assessment --answers--> ApprovalFlow",
          "Assignment --fulfills--> WorkItem",
          "Assignment --assignedTo--> Member"
      )
  ));

  private final AtomicInteger flowSeq = new AtomicInteger(100);
  private final AtomicInteger assignSeq = new AtomicInteger(500);

  public String nextFlowId() { return "AF-2026-" + flowSeq.incrementAndGet(); }
  public String nextAssignmentId() { return "AS-2026-" + assignSeq.incrementAndGet(); }
}
