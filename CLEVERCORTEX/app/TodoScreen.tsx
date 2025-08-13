import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Animated,
  Easing,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  dueDate: string;
  duration: number;
  category: string;
  subtasks: Subtask[];
  dependencies: string[];
  createdAt: number;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

const TodoScreen: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [priority, setPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('Medium');
  const [dueDate, setDueDate] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [showPriorityModal, setShowPriorityModal] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(30);
  const [showAddSubtask, setShowAddSubtask] = useState<boolean>(false);
  const [newSubtask, setNewSubtask] = useState<string>('');
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [showDependenciesModal, setShowDependenciesModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'createdAt'>('priority');
  const [isFormExpanded, setIsFormExpanded] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<{ id: string | null, isEditing: boolean }>({ id: null, isEditing: false });
  const [editedTodo, setEditedTodo] = useState<Partial<Todo>>({});

  // Animation values
  const formHeight = useState(new Animated.Value(150))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(1.95))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.elastic(1),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const toggleFormExpansion = () => {
    Animated.timing(formHeight, {
      toValue: isFormExpanded ? 80 : 400,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setIsFormExpanded(!isFormExpanded);
  };

  const addTodo = () => {
    if (!newTodo.trim()) {
      Alert.alert('Error', 'Task title cannot be empty');
      return;
    }

    const todo: Todo = {
      id: Date.now().toString(),
      title: newTodo,
      description: newDescription,
      completed: false,
      priority,
      dueDate,
      duration,
      category,
      subtasks: [],
      dependencies,
      createdAt: Date.now()
    };

    setTodos([...todos, todo]);
    resetForm();
    toggleFormExpansion();
  };

  const updateTodo = () => {
    if (!editedTodo.title?.trim()) {
      Alert.alert('Error', 'Task title cannot be empty');
      return;
    }

    setTodos(todos.map(todo => 
      todo.id === editMode.id ? { ...todo, ...editedTodo } : todo
    ));
    setEditMode({ id: null, isEditing: false });
    setEditedTodo({});
  };

  const resetForm = () => {
    setNewTodo('');
    setNewDescription('');
    setPriority('Medium');
    setDueDate('');
    setCategory('');
    setDuration(30);
    setDependencies([]);
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setTodos(todos.filter(todo => todo.id !== id));
            setTodos(prevTodos =>
              prevTodos.map(todo => ({
                ...todo,
                dependencies: todo.dependencies.filter(depId => depId !== id)
              }))
            );
          }
        }
      ]
    );
  };

  const startEditing = (todo: Todo) => {
    setEditMode({ id: todo.id, isEditing: true });
    setEditedTodo({
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      dueDate: todo.dueDate,
      duration: todo.duration,
      category: todo.category,
      dependencies: todo.dependencies
    });
    toggleFormExpansion();
  };

  const addSubtask = () => {
    if (!newSubtask.trim() || !selectedTodoId) return;

    const subtask: Subtask = {
      id: Date.now().toString(),
      title: newSubtask,
      completed: false,
    };

    setTodos(todos.map(todo => 
      todo.id === selectedTodoId 
        ? { ...todo, subtasks: [...todo.subtasks, subtask] } 
        : todo
    ));

    setNewSubtask('');
    setShowAddSubtask(false);
  };

  const toggleSubtask = (todoId: string, subtaskId: string) => {
    setTodos(todos.map(todo =>
      todo.id === todoId
        ? {
          ...todo,
          subtasks: todo.subtasks.map(subtask =>
            subtask.id === subtaskId
              ? { ...subtask, completed: !subtask.completed }
              : subtask
          )
        }
        : todo
    ));
  };

  const onDayPress = (day: any) => {
    setDueDate(day.dateString);
    setShowCalendar(false);
    if (editMode.isEditing) {
      setEditedTodo({ ...editedTodo, dueDate: day.dateString });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return '#ff4757';
      case 'High': return '#ff7f50';
      case 'Medium': return '#ffa502';
      case 'Low': return '#2ed573';
      default: return '#1e1e1e';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'warning';
      case 'High': return 'arrow-upward';
      case 'Medium': return 'adjust';
      case 'Low': return 'arrow-downward';
      default: return 'circle';
    }
  };

  const getCompletionStats = () => {
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const filteredTodos = todos
    .filter(todo =>
      todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      } else if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else {
        return b.createdAt - a.createdAt;
      }
    });

  const stats = getCompletionStats();

  const renderRightActions = (progress: any, dragX: any, item: Todo) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeActionsContainer}>
        <Animated.View style={[styles.swipeAction, styles.editAction, { transform: [{ scale }] }]}>
          <TouchableOpacity onPress={() => startEditing(item)}>
            <Icon name="edit" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={[styles.swipeAction, styles.deleteAction, { transform: [{ scale }] }]}>
          <TouchableOpacity onPress={() => deleteTodo(item.id)}>
            <Icon name="delete" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#121212', '#1a1a1a']}
        style={styles.background}
      >
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.title}>Productivity Pro</Text>
              <Text style={styles.subtitle}>Organize your work and life</Text>
              
              <View style={styles.searchContainer}>
                <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search tasks..."
                  placeholderTextColor="#888"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <Animated.View style={[styles.inputContainer, { height: formHeight }]}>
              {editMode.isEditing ? (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Edit task"
                    placeholderTextColor="#888"
                    value={editedTodo.title}
                    onChangeText={(text) => setEditedTodo({ ...editedTodo, title: text })}
                  />
                  <TextInput
                    style={[styles.input, styles.descriptionInput]}
                    placeholder="Edit description (optional)"
                    placeholderTextColor="#888"
                    value={editedTodo.description}
                    onChangeText={(text) => setEditedTodo({ ...editedTodo, description: text })}
                    multiline
                  />
                </>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Add a new task"
                  placeholderTextColor="#888"
                  value={newTodo}
                  onChangeText={setNewTodo}
                  onFocus={toggleFormExpansion}
                />
              )}

              {isFormExpanded && (
                <>
                  <TextInput
                    style={[styles.input, styles.descriptionInput]}
                    placeholder={editMode.isEditing ? "Edit description (optional)" : "Description (optional)"}
                    placeholderTextColor="#888"
                    value={editMode.isEditing ? editedTodo.description : newDescription}
                    onChangeText={(text) => editMode.isEditing 
                      ? setEditedTodo({ ...editedTodo, description: text })
                      : setNewDescription(text)}
                    multiline
                  />

                  <View style={styles.formRow}>
                    <TouchableOpacity 
                      style={[
                        styles.priorityButton, 
                        { 
                          backgroundColor: getPriorityColor(editMode.isEditing ? editedTodo.priority || 'Medium' : priority),
                          flex: 1.5
                        }
                      ]}
                      onPress={() => setShowPriorityModal(true)}
                    >
                      <Text style={[styles.buttonText, (editMode.isEditing ? editedTodo.priority === 'Low' : priority === 'Low') && styles.darkButtonText]}>
                        <Icon 
                          name={getPriorityIcon(editMode.isEditing ? editedTodo.priority || 'Medium' : priority)} 
                          size={16} 
                          color={editMode.isEditing && editedTodo.priority === 'Low' ? '#000' : '#fff'} 
                        />{' '}
                        {editMode.isEditing ? editedTodo.priority || 'Medium' : priority}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.dateButton, { flex: 1 }]}
                      onPress={() => setShowCalendar(true)}
                    >
                      <Text style={styles.buttonText}>
                        <Icon name="calendar-today" size={16} color="#fff" />{' '}
                        {editMode.isEditing 
                          ? editedTodo.dueDate 
                            ? new Date(editedTodo.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : 'Due Date'
                          : dueDate 
                            ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : 'Due Date'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formRow}>
                    <TouchableOpacity 
                      style={[styles.categoryButton, { flex: 1.5 }]}
                      onPress={() => setShowCategoryModal(true)}
                    >
                      <Text style={styles.buttonText}>
                        <Icon name="label" size={16} color="#fff" />{' '}
                        {editMode.isEditing ? editedTodo.category || 'Category' : category || 'Category'}
                      </Text>
                    </TouchableOpacity>

                    <View style={[styles.durationContainer, { flex: 1 }]}>
                      <TextInput
                        style={[styles.input, styles.durationInput]}
                        placeholder="Duration"
                        placeholderTextColor="#888"
                        value={editMode.isEditing ? editedTodo.duration?.toString() || '30' : duration.toString()}
                        onChangeText={(text) => editMode.isEditing
                          ? setEditedTodo({ ...editedTodo, duration: Number(text) || 0 })
                          : setDuration(Number(text) || 0)}
                        keyboardType="numeric"
                      />
                      <Text style={styles.durationLabel}>min</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.dependenciesButton}
                    onPress={() => setShowDependenciesModal(true)}
                  >
                    <Text style={styles.buttonText}>
                      <Icon name="link" size={16} color="#fff" />{' '}
                      {editMode.isEditing
                        ? editedTodo.dependencies?.length > 0 
                          ? `${editedTodo.dependencies.length} Dependencies` 
                          : 'Add Dependencies'
                        : dependencies.length > 0 
                          ? `${dependencies.length} Dependencies` 
                          : 'Add Dependencies'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity 
                style={[styles.addButton, editMode.isEditing && styles.updateButton]}
                onPress={editMode.isEditing ? updateTodo : addTodo}
              >
                <Text style={styles.addButtonText}>
                  <Icon 
                    name={editMode.isEditing ? "check" : "add"} 
                    size={20} 
                    color="#121212" 
                    style={styles.addButtonIcon} 
                  />
                  {editMode.isEditing ? "Update Task" : "Add Task"}
                </Text>
              </TouchableOpacity>

              {editMode.isEditing && (
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditMode({ id: null, isEditing: false });
                    setEditedTodo({});
                    toggleFormExpansion();
                  }}
                >
                  <Text style={styles.cancelButtonText}>
                    <Icon name="close" size={20} color="#ff4757" /> Cancel
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>

            <View style={styles.statsContainer}>
              <View style={styles.progressBar}>
                <Animated.View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${stats.percentage}%`,
                      backgroundColor: stats.percentage === 100 ? '#2ed573' : '#ffa502'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.statsText}>
                {stats.completed} of {stats.total} tasks completed ({stats.percentage}%)
              </Text>
            </View>

            <View style={styles.sortContainer}>
              <Text style={styles.sortLabel}>Sort by:</Text>
              <TouchableOpacity 
                style={[styles.sortButton, sortBy === 'priority' && styles.activeSortButton]}
                onPress={() => setSortBy('priority')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'priority' && styles.activeSortButtonText]}>
                  Priority
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sortButton, sortBy === 'dueDate' && styles.activeSortButton]}
                onPress={() => setSortBy('dueDate')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'dueDate' && styles.activeSortButtonText]}>
                  Due Date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sortButton, sortBy === 'createdAt' && styles.activeSortButton]}
                onPress={() => setSortBy('createdAt')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'createdAt' && styles.activeSortButtonText]}>
                  Recent
                </Text>
              </TouchableOpacity>
            </View>

            {filteredTodos.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="check-circle-outline" size={60} color="#555" />
                <Text style={styles.emptyStateText}>No tasks found</Text>
                <Text style={styles.emptyStateSubtext}>Add a new task to get started</Text>
              </View>
            ) : (
              <FlatList
                data={filteredTodos}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <Swipeable
                    renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
                    overshootRight={false}
                  >
                    <TodoItem 
                      item={item}
                      index={index}
                      toggleTodo={toggleTodo}
                      deleteTodo={deleteTodo}
                      toggleSubtask={toggleSubtask}
                      setSelectedTodoId={setSelectedTodoId}
                      setShowAddSubtask={setShowAddSubtask}
                      getPriorityColor={getPriorityColor}
                      getPriorityIcon={getPriorityIcon}
                    />
                  </Swipeable>
                )}
                contentContainerStyle={styles.listContent}
              />
            )}
          </ScrollView>
        </Animated.View>
      </LinearGradient>

      {/* Priority Selection Modal */}
      <Modal visible={showPriorityModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.modalTitle}>Select Priority</Text>
            {(['Critical', 'High', 'Medium', 'Low'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.modalOption, { backgroundColor: getPriorityColor(level) }]}
                onPress={() => {
                  if (editMode.isEditing) {
                    setEditedTodo({ ...editedTodo, priority: level });
                  } else {
                    setPriority(level);
                  }
                  setShowPriorityModal(false);
                }}
              >
                <Text style={[styles.buttonText, level === 'Low' && styles.darkButtonText]}>
                  <Icon name={getPriorityIcon(level)} size={16} color={level === 'Low' ? '#000' : '#fff'} />{' '}
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowPriorityModal(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal visible={showCalendar} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.modalContent, styles.calendarModal, { transform: [{ scale: scaleAnim }] }]}>
            <Calendar
              onDayPress={onDayPress}
              markedDates={{
                [editMode.isEditing ? editedTodo.dueDate || '' : dueDate]: { 
                  selected: true, 
                  selectedColor: '#ff4757',
                  selectedTextColor: '#fff'
                }
              }}
              theme={{
                backgroundColor: '#1e1e1e',
                calendarBackground: '#1e1e1e',
                textSectionTitleColor: '#ffffff',
                selectedDayBackgroundColor: '#ff4757',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#ff4757',
                dayTextColor: '#ffffff',
                textDisabledColor: '#444444',
                arrowColor: '#ffffff',
                monthTextColor: '#ffffff',
                indicatorColor: '#ffffff',
                dotColor: '#ff4757',
                todayDotColor: '#ffffff',
              }}
            />
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Category Selection Modal */}
      <Modal visible={showCategoryModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <View style={styles.categoryGrid}>
              {['Work', 'Personal', 'Health', 'Finance', 'Shopping', 'Other'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption, 
                    (editMode.isEditing ? editedTodo.category === cat : category === cat) && styles.selectedCategory
                  ]}
                  onPress={() => {
                    if (editMode.isEditing) {
                      setEditedTodo({ ...editedTodo, category: cat });
                    } else {
                      setCategory(cat);
                    }
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={styles.buttonText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Custom Category"
              placeholderTextColor="#888"
              value={editMode.isEditing ? editedTodo.category || '' : category}
              onChangeText={(text) => editMode.isEditing 
                ? setEditedTodo({ ...editedTodo, category: text })
                : setCategory(text)}
            />
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Add Subtask Modal */}
      <Modal visible={showAddSubtask} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.modalTitle}>Add Subtask</Text>
            <TextInput
              style={styles.input}
              placeholder="Subtask description"
              placeholderTextColor="#888"
              value={newSubtask}
              onChangeText={setNewSubtask}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={addSubtask}
              >
                <Text style={styles.addButtonText}>Add Subtask</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAddSubtask(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Dependencies Modal */}
      <Modal visible={showDependenciesModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.modalContent, styles.dependenciesModal, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.modalTitle}>Select Dependencies</Text>
            <FlatList
              data={todos.filter(todo => editMode.isEditing ? todo.id !== editMode.id : true)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dependencyItem, 
                    (editMode.isEditing 
                      ? editedTodo.dependencies?.includes(item.id) 
                      : dependencies.includes(item.id)) && styles.selectedDependency
                  ]}
                  onPress={() => {
                    if (editMode.isEditing) {
                      const currentDeps = editedTodo.dependencies || [];
                      if (currentDeps.includes(item.id)) {
                        setEditedTodo({ 
                          ...editedTodo, 
                          dependencies: currentDeps.filter(id => id !== item.id) 
                        });
                      } else {
                        setEditedTodo({ 
                          ...editedTodo, 
                          dependencies: [...currentDeps, item.id] 
                        });
                      }
                    } else {
                      if (dependencies.includes(item.id)) {
                        setDependencies(dependencies.filter(id => id !== item.id));
                      } else {
                        setDependencies([...dependencies, item.id]);
                      }
                    }
                  }}
                >
                  <Text style={styles.dependencyText}>
                    {(editMode.isEditing 
                      ? editedTodo.dependencies?.includes(item.id) 
                      : dependencies.includes(item.id)) ? '✓ ' : ''}{item.title}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowDependenciesModal(false)}
            >
              <Text style={styles.buttonText}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const TodoItem = ({ 
  item, 
  index, 
  toggleTodo, 
  deleteTodo, 
  toggleSubtask, 
  setSelectedTodoId, 
  setShowAddSubtask, 
  getPriorityColor,
  getPriorityIcon
}: any) => {
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.95))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        easing: Easing.elastic(1),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.todoItem,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          borderLeftWidth: 4,
          borderLeftColor: getPriorityColor(item.priority),
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }
      ]}
    >
      <View style={styles.todoHeader}>
        <TouchableOpacity onPress={() => toggleTodo(item.id)}>
          <View style={[styles.checkbox, item.completed && styles.checkboxCompleted]}>
            {item.completed && <Icon name="check" size={16} color="#121212" />}
          </View>
        </TouchableOpacity>
        <Text style={[styles.todoTitle, item.completed && styles.completed]}>
          {item.title}
        </Text>
        <View style={styles.priorityIndicator}>
          <Icon 
            name={getPriorityIcon(item.priority)} 
            size={16} 
            color={getPriorityColor(item.priority)} 
          />
        </View>
      </View>

      {item.description ? (
        <Text style={styles.todoDescription}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.todoMeta}>
        <View style={styles.metaRow}>
          {item.category ? (
            <View style={styles.metaItem}>
              <Icon name="label" size={14} color="#aaa" />
              <Text style={styles.metaText}>
                {item.category}
              </Text>
            </View>
          ) : null}
          
          {item.dueDate ? (
            <View style={styles.metaItem}>
              <Icon name="event" size={14} color="#aaa" />
              <Text style={styles.metaText}>
                {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          ) : null}
          
          {item.duration ? (
            <View style={styles.metaItem}>
              <Icon name="access-time" size={14} color="#aaa" />
              <Text style={styles.metaText}>
                {item.duration} min
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {item.subtasks.length > 0 && (
        <View style={styles.subtasksContainer}>
          {item.subtasks.map((subtask: Subtask) => (
            <TouchableOpacity 
              key={subtask.id} 
              style={styles.subtaskItem}
              onPress={() => toggleSubtask(item.id, subtask.id)}
            >
              <View style={[styles.subtaskCheckbox, subtask.completed && styles.subtaskCheckboxCompleted]}>
                {subtask.completed && <Icon name="check" size={12} color="#121212" />}
              </View>
              <Text style={[styles.subtaskText, subtask.completed && styles.completed]}>
                {subtask.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity 
        style={styles.addSubtaskButton}
        onPress={() => {
          setSelectedTodoId(item.id);
          setShowAddSubtask(true);
        }}
      >
        <Icon name="add" size={16} color="#aaa" />
        <Text style={styles.addSubtaskText}>Add Subtask</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    color: '#ffffff',
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 20,
    overflow: 'hidden',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  priorityButton: {
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryButton: {
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    paddingLeft: 15,
  },
  durationInput: {
    flex: 1,
    marginBottom: 0,
    borderWidth: 0,
    paddingLeft: 0,
  },
  durationLabel: {
    color: '#888',
    marginRight: 15,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  darkButtonText: {
    color: '#000',
  },
  buttonIcon: {
    marginLeft: 5,
  },
  dependenciesButton: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  addButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  updateButton: {
    backgroundColor: '#2ed573',
  },
  cancelButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4757',
  },
  cancelButtonText: {
    color: '#ff4757',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addButtonIcon: {
    marginRight: 8,
  },
  statsContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1e1e1e',
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#aaaaaa',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sortLabel: {
    color: '#888',
    marginRight: 10,
    fontSize: 14,
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  sortButtonText: {
    color: '#aaa',
    fontSize: 14,
  },
  activeSortButton: {
    backgroundColor: '#333',
    borderColor: '#555',
  },
  activeSortButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  todoItem: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  todoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  checkboxCompleted: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  priorityIndicator: {
    marginLeft: 10,
  },
  todoTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  completed: {
    textDecorationLine: 'line-through',
    color: '#888888',
  },
  todoDescription: {
    marginBottom: 15,
    fontSize: 14,
    lineHeight: 20,
    color: '#cccccc',
  },
  todoMeta: {
    marginBottom: 15,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 13,
    color: '#aaa',
    marginLeft: 5,
  },
  subtasksContainer: {
    marginLeft: 10,
    marginBottom: 15,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  subtaskCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#888',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtaskCheckboxCompleted: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  subtaskText: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
  },
  addSubtaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  addSubtaskText: {
    color: '#aaaaaa',
    fontSize: 14,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  calendarModal: {
    padding: 0,
    overflow: 'hidden',
  },
  dependenciesModal: {
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#ffffff',
  },
  modalOption: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  categoryOption: {
    width: '48%',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedCategory: {
    backgroundColor: '#333',
    borderColor: '#555',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalActionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#ffffff',
  },
  modalCancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  dependencyItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedDependency: {
    borderColor: '#ff4757',
  },
  dependencyText: {
    fontSize: 16,
    color: '#fff',
  },
  swipeActionsContainer: {
    flexDirection: 'row',
    width: 100,
    marginBottom: 15,
  },
  swipeAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAction: {
    backgroundColor: '#ffa502',
  },
  deleteAction: {
    backgroundColor: '#ff4757',
  },
});

export default TodoScreen;